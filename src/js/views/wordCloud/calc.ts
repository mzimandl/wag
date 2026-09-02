/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface WordCloudItemCalc {
    text: string;
    value: number;
    tooltip: TooltipData;
    interactionId: string;
    size?: number;
    color?: string;
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
    fontSize?: number;
    data?: WordCloudItemCalc;
}

export const MAX_WC_FONT_SIZE = 78;

export const MAX_WC_FONT_SIZE_MOBILE = 73; // TODO test this one

const MIN_WC_FONT_SIZE = 26;

const MIN_WC_FONT_SIZE_MOBILE = 23;

// How many spiral positions we are willing to try before giving up and
// falling back to the least-bad position found so far. This needs to be
// generous because later (smaller) words may have to search past a lot
// of already-placed rectangles before finding free space.
const PLACE_NUM_SPIRAL_ITER = 20000;

// A finer angular step than before gives the spiral more candidate points
// per revolution, so it doesn't "jump over" a perfectly good nearby slot
// and shoot a word further out than necessary (one cause of uneven,
// overly large gaps).
const SPIRAL_STEP = Math.PI / 90;

const SPIRAL_PARAM_A = 2;

const SPIRAL_PARAM_B = 0.75;

// Fixed, near-constant pixel padding kept between any two words, regardless
// of their font size. Previously the margin was `fontSize * 0.2-0.25`,
// meaning two large words were forced apart by ~15-20px while two small
// words only needed ~5-6px of clearance. That inconsistency is exactly
// what produced "too much space here, words touching there" - a small,
// capped constant keeps visual spacing consistent across the whole cloud.
const MIN_WORD_PADDING = 5;
const MAX_WORD_PADDING = 13;

export type TooltipData = Array<{
    label: string;
    value: string | number;
    unit?: string;
    round?: number;
}>;

function adjustFontSize(isMobile: boolean, v: number): number {
    return isMobile
        ? Math.round(Math.min(MAX_WC_FONT_SIZE_MOBILE, v))
        : Math.round(Math.min(MAX_WC_FONT_SIZE, v));
}

function calcOverlap(rA: Rect, rB: Rect): number {
    const avgFontSize = (rA.fontSize + rB.fontSize) / 2;
    const margin = Math.min(
        MAX_WORD_PADDING,
        Math.max(MIN_WORD_PADDING, avgFontSize * 0.15)
    );

    return (
        Math.max(
            0,
            Math.min(rA.x + rA.w + margin, rB.x + rB.w + margin) -
                Math.max(rA.x - margin, rB.x - margin)
        ) *
        Math.max(
            0,
            Math.min(rA.y + rA.h + margin, rB.y + rB.h + margin) -
                Math.max(rA.y - margin, rB.y - margin)
        )
    );
}

/**
 *
 */
class FontMeasure {
    private readonly canv: HTMLCanvasElement;

    constructor() {
        this.canv = document.createElement('canvas');
        //canv.style.display = 'none';
        document.body.appendChild(this.canv);
    }

    getTextWidth(text: string, fontName: string, fontSize: number) {
        const ctx = this.canv.getContext('2d');
        // Words render bold (fontWeight 700 in the <Word/> component below),
        // so the measurement has to use the same weight - otherwise this
        // returns the width of the *regular*-weight glyphs, which are
        // noticeably narrower than what's actually drawn. That mismatch
        // was the main cause of adjacent words visually overlapping even
        // though their computed rectangles didn't.
        ctx.font = `bold ${fontSize}px ${fontName}`;
        return ctx.measureText(text).width;
    }

    close(): void {
        document.body.removeChild(this.canv);
    }
}

function boundingBox(rects: Array<Rect>): Rect {
    let xMin = rects[0].x;
    let yMin = rects[0].y;
    let xMax = rects[0].x + rects[0].w;
    let yMax = rects[0].y + rects[0].h;
    let yMaxTmp = 0;
    // We must increase height to prevent cutting of descender letters (g, j, y,...)
    // so we keep a size of the text at the bottom and then use a portion of the size
    // to increase the height of the cloud box.
    let bottomTextFontSize = rects[0].fontSize;

    rects.forEach((rect) => {
        xMin = Math.min(xMin, rect.x);
        yMin = Math.min(yMin, rect.y);
        xMax = Math.max(xMax, rect.x + rect.w);
        yMaxTmp = Math.max(yMax, rect.y + rect.h);
        if (yMaxTmp > yMax) {
            bottomTextFontSize = rect.fontSize;
        }
        yMax = yMaxTmp;
    });
    return {
        x: xMin,
        y: yMin,
        w: xMax - xMin,
        h: yMax - yMin + bottomTextFontSize / 6,
    };
}

// Deterministic string hash (FNV-1a) so each word always gets the same
// spiral starting angle across re-renders/resizes, instead of a fresh
// random angle every time (which would make the layout jump around).
function hashString(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function mkSpiralPoint(
    centerX: number,
    centerY: number,
    idx: number,
    aspectRatio: number,
    phaseOffset: number
): [number, number] {
    const phi = idx * SPIRAL_STEP + phaseOffset;
    const xc =
        (SPIRAL_PARAM_A + SPIRAL_PARAM_B * phi * aspectRatio) * Math.cos(phi);
    const yc =
        (SPIRAL_PARAM_A + (SPIRAL_PARAM_B * phi * 1) / aspectRatio) *
        Math.sin(phi);
    return [xc + centerX, yc + centerY];
}

function placeRect(
    rects: Array<Rect>,
    idx: number,
    initialX: number,
    initialY: number,
    aspectRatio: number,
    phaseOffset: number
): void {
    // Keep aspect ratio closer to original to maintain spiral flow
    const corrAspRatio =
        aspectRatio > 1 ? aspectRatio ** 0.6 : aspectRatio ** 0.5;

    // Track the least-bad candidate we've seen so that if we never find a
    // fully free spot, we use the best available position instead of
    // whatever the very last spiral step happened to land on. Previously,
    // running out of iterations meant the word was simply dropped wherever
    // the spiral last pointed - often squarely on top of another word.
    let bestX = initialX;
    let bestY = initialY;
    let bestOverlap = Infinity;

    for (let i = 0; i < PLACE_NUM_SPIRAL_ITER; i += 1) {
        const [px, py] = mkSpiralPoint(
            initialX,
            initialY,
            i,
            corrAspRatio,
            phaseOffset
        );
        rects[idx].x = px;
        rects[idx].y = py;

        let worstOverlapHere = 0;
        for (let j = 0; j < idx; j += 1) {
            const overlap = calcOverlap(rects[idx], rects[j]);
            if (overlap > worstOverlapHere) {
                worstOverlapHere = overlap;
            }
            if (worstOverlapHere >= bestOverlap) {
                // Already at least as bad as our current best candidate -
                // no need to keep comparing against the remaining rects.
                break;
            }
        }

        if (worstOverlapHere === 0) {
            return; // fully free spot found, done
        }
        if (worstOverlapHere < bestOverlap) {
            bestOverlap = worstOverlapHere;
            bestX = px;
            bestY = py;
        }
    }

    rects[idx].x = bestX;
    rects[idx].y = bestY;
}

/**
 * Create rectangle objects (with their position, size and data) placed in a "word cloud" way.
 */
function createRectangles(
    data: Array<WordCloudItemCalc>,
    frameWidth: number,
    frameHeight: number,
    isMobile: boolean,
    font: string
): Array<Rect> {
    const ans: Array<Rect> = [];
    const measure = new FontMeasure();
    const minVal = Math.min(...data.map((v) => v.value));
    const maxVal = Math.max(...data.map((v) => v.value));
    const valRange = maxVal - minVal;
    const minSize = isMobile ? MIN_WC_FONT_SIZE_MOBILE : MIN_WC_FONT_SIZE;
    const maxSize = isMobile ? MAX_WC_FONT_SIZE_MOBILE : MAX_WC_FONT_SIZE;

    data.forEach((wcitem) => {
        const wcFontSizeRatio =
            valRange > 0 ? (wcitem.value - minVal) / valRange : 1;
        // Font area should scale with value, not font size linearly - so we
        // scale the *font size* by the square root of the normalized value.
        // This spreads words evenly across the min-max range (rather than
        // the old formula, which pushed almost everything to either the
        // absolute min or the absolute max size with very little in
        // between - a big contributor to the uneven-looking layout).
        const fontSize = adjustFontSize(
            isMobile,
            minSize + Math.sqrt(wcFontSizeRatio) * (maxSize - minSize)
        );
        const width = measure.getTextWidth(wcitem.text, font, fontSize);
        const height = fontSize * 1.1;
        // Small deterministic offset (derived from the word's own text)
        // to break perfect symmetry between same-sized words, without
        // making the layout change between renders.
        const jitterSeed = hashString(wcitem.text);
        const randomOffsetX =
            ((jitterSeed % 200) / 200 - 0.5) * fontSize * 0.15;
        const randomOffsetY =
            (((jitterSeed >>> 8) % 200) / 200 - 0.5) * fontSize * 0.15;
        const x1 = frameWidth / 2 - width / 2 + randomOffsetX;
        const y1 = frameHeight / 2 - height / 2 + randomOffsetY;

        ans.push({
            x: x1,
            y: y1,
            w: width,
            h: height,
            fontSize: fontSize,
            data: wcitem,
        });
    });

    measure.close();
    return ans;
}

/**
 * Center, and half-width/half-height, of the bounding box of the first
 * `count` already-placed rectangles.
 */
function placedBBoxStats(
    rects: Array<Rect>,
    count: number
): { cx: number; cy: number; halfW: number; halfH: number } {
    let xMin = rects[0].x;
    let xMax = rects[0].x + rects[0].w;
    let yMin = rects[0].y;
    let yMax = rects[0].y + rects[0].h;
    for (let i = 1; i < count; i += 1) {
        xMin = Math.min(xMin, rects[i].x);
        xMax = Math.max(xMax, rects[i].x + rects[i].w);
        yMin = Math.min(yMin, rects[i].y);
        yMax = Math.max(yMax, rects[i].y + rects[i].h);
    }
    return {
        cx: (xMin + xMax) / 2,
        cy: (yMin + yMax) / 2,
        halfW: (xMax - xMin) / 2,
        halfH: (yMax - yMin) / 2,
    };
}

// Eight compass directions used to distribute words around the cloud built
// so far, rather than letting every word's search start from the same
// point and drift toward whichever gap happens to be geometrically
// cheapest (which, for a couple of wide title words, is reliably "below").
const ANCHOR_DIRS: Array<[number, number]> = [
    [0, -1], // N
    [0.7071, -0.7071], // NE
    [1, 0], // E
    [0.7071, 0.7071], // SE
    [0, 1], // S
    [-0.7071, 0.7071], // SW
    [-1, 0], // W
    [-0.7071, -0.7071], // NW
];

// How far outside the core shape's edge (in that compass direction) a
// word's search starts. 1.0 means "right at the edge"; kept small so
// words settle close to the big words rather than drifting far out into
// empty space.
const ANCHOR_MARGIN_FACTOR = 1.02;
const ANCHOR_JITTER_RANGE = 0.18;

export const createWordCloud = (
    data: Array<WordCloudItemCalc>,
    frameWidth: number,
    frameHeight: number,
    isMobile: boolean,
    font: string
): { rectangles: Array<Rect>; transform: string } => {
    const rectangles = createRectangles(
        data,
        frameWidth,
        frameHeight,
        isMobile,
        font
    ).sort((r1, r2) => {
        // Place the largest words first ("biggest-first" packing). This is
        // the standard word-cloud strategy: big words claim central space
        // while it's still open, and progressively smaller ones fill the
        // remaining gaps around them. Mixing in raw `value` here (as the
        // previous 70/30 weighting did) could put a high-value-but-small
        // rectangle ahead of a larger one, which then had to search much
        // further out for space - producing exactly the "some words far
        // apart, some jammed together" effect being reported.
        return r2.w * r2.h - r1.w * r1.h;
    });
    const frameAspect = frameWidth / frameHeight;
    // Reference shape used to anchor every other word's compass direction.
    // Deliberately frozen to just the first (biggest) word or two, rather
    // than recomputed from the whole cloud on every iteration - if it kept
    // growing to include already-placed peripheral words, each new word
    // would anchor off an already-expanded shape and push it out even
    // further, snowballing into a sparse layout with large empty gaps.
    let coreStats: { cx: number; cy: number; halfW: number; halfH: number } = {
        cx: frameWidth / 2,
        cy: frameHeight / 2,
        halfW: 0,
        halfH: 0,
    };

    for (let i = 0; i < rectangles.length; i += 1) {
        const text = rectangles[i].data.text;
        // Each word gets its own starting angle for the local spiral fine-
        // search, derived deterministically from its text.
        const phaseOffset = ((hashString(text) % 1000) / 1000) * 2 * Math.PI;

        let initX: number;
        let initY: number;
        if (i === 0) {
            // The single biggest word always starts dead-center.
            initX = frameWidth / 2 - rectangles[i].w / 2;
            initY = frameHeight / 2 - rectangles[i].h / 2;
        } else {
            if (i <= 2) {
                // Freeze the reference shape as soon as the first one or
                // two (biggest) words are placed.
                coreStats = placedBBoxStats(rectangles, Math.min(2, i));
            }
            // Every other word is assigned one of 8 compass directions
            // (deterministically, from its own text so the assignment is
            // stable), and its search starts just outside the core shape's
            // edge in that direction - not from the frame's dead center,
            // and not from the ever-growing full cloud. This guarantees
            // words get distributed to the sides and above the big words
            // (instead of all sharing whichever gap is geometrically
            // cheapest, which for a couple of wide stacked title words is
            // reliably "straight down"), while staying anchored to the
            // core shape so the layout stays compact instead of drifting
            // outward. The local spiral search below still fine-tunes
            // from that anchor to the nearest actually-free spot, so
            // several words assigned to the same direction fan out beside
            // each other rather than colliding or launching further out.
            const anchor =
                ANCHOR_DIRS[hashString(text + '#dir') % ANCHOR_DIRS.length];
            // Small per-word variation in how far past the core edge the
            // anchor sits, so words sharing the same compass slot don't
            // all start their search from the exact same ring distance
            // (which tended to make them settle into a too-regular,
            // evenly-spaced row).
            const anchorFactor =
                ANCHOR_MARGIN_FACTOR +
                ((hashString(text + '#r') % 1000) / 1000) * ANCHOR_JITTER_RANGE;
            // A single radius shared by every compass direction, rather
            // than scaling x-reach by the core's half-width and y-reach
            // by its half-height separately. The core (the one or two
            // biggest words) is usually much wider than it is tall, so
            // scaling anchors by width/height directly would stretch the
            // whole compass ring into that same wide-short shape - pushing
            // E/W words very far out while N/S words barely move, leaving
            // the frame's vertical space empty. Averaging the two gives a
            // roughly circular spread around the core instead.
            const coreRadius = (coreStats.halfW + coreStats.halfH) / 2;
            const anchorX =
                coreStats.cx + anchor[0] * coreRadius * anchorFactor;
            const anchorY =
                coreStats.cy + anchor[1] * coreRadius * anchorFactor;
            initX = anchorX - rectangles[i].w / 2;
            initY = anchorY - rectangles[i].h / 2;
        }

        placeRect(rectangles, i, initX, initY, frameAspect, phaseOffset);
    }
    const bbox =
        data.length > 0
            ? boundingBox(rectangles)
            : { x: 0, y: 0, w: frameWidth, h: frameHeight };
    // More generous scaling to prevent cramping
    const scale = Math.min(
        (frameWidth * 0.98) / bbox.w,
        (frameHeight * 0.95) / bbox.h
    );
    return {
        rectangles: rectangles,
        transform: `translate(${-bbox.x * scale} ${-bbox.y * scale}) scale(${scale}, ${scale})`,
    };
};
