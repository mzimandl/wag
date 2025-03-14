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
import { QueryType } from '../../../query/index.js';
import { AltViewIconProps, DEFAULT_ALT_VIEW_ICON, ITileProvider, ITileReloader, TileComponent, TileConf, TileFactory, TileFactoryArgs } from '../../../page/tile.js';
import { SpeechesModel } from './model.js';
import { init as viewInit } from './view.js';
import { LocalizedConfMsg } from '../../../types.js';
import { createAudioUrlGeneratorInstance, createSpeechesApiInstance } from '../../../api/factory/speeches.js';
import { pipe, Color, List } from 'cnc-tskit';
import { CoreApiGroup } from '../../../api/coreGroups.js';


export interface SpeechesTileConf extends TileConf {
    apiType:string;
    apiURL:string;
    corpname:string;
    subcname?:string;
    subcDesc?:LocalizedConfMsg;
    speakerIdAttr:[string, string];
    speechSegment:[string, string];
    speechOverlapAttr:[string, string];
    speechOverlapVal:string;
    audioPlaybackUrl?:string;
    maxNumSpeeches?:number;
}


export class SpeechesTile implements ITileProvider {


    private readonly model:SpeechesModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly blockingTiles:Array<number>;

    private static readonly DEFAULT_MAX_NUM_SPEECHES = 8;

    constructor({
        dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles, ut,
        theme, appServices, widthFract, conf, isBusy
    }:TileFactoryArgs<SpeechesTileConf>) {

        this.tileId = tileId;
        this.widthFract = widthFract;
        this.label = appServices.importExternalMessage(conf.label);
        this.blockingTiles = waitForTiles;
        const colorGen = theme.categoryPalette(List.repeat(v => v, 10));
        const apiOptions = conf.apiType === CoreApiGroup.KONTEXT_API ?
            {authenticateURL: appServices.createActionUrl("/SpeechesTile/authenticate")} :
            {};
        this.model = new SpeechesModel({
            dispatcher,
            tileId,
            appServices,
            api: createSpeechesApiInstance(conf.apiType, conf.apiURL, appServices, apiOptions),
            backlink: conf.backlink || null,
            waitForTiles,
            waitForTilesTimeoutSecs,
            subqSourceTiles,
            audioLinkGenerator: conf.audioPlaybackUrl ?
                    createAudioUrlGeneratorInstance(conf.apiType, conf.audioPlaybackUrl) :
                    null,
            initState: {
                isBusy: isBusy,
                isTweakMode: false,
                isMobile: appServices.isMobileMode(),
                error: null,
                corpname: conf.corpname,
                subcname: conf.subcname,
                subcDesc: conf.subcDesc ? appServices.importExternalMessage(conf.subcDesc) : '',
                concId: null,
                speakerIdAttr: [conf.speakerIdAttr[0], conf.speakerIdAttr[1]],
                speechSegment: [conf.speechSegment[0], conf.speechSegment[1]],
                speechOverlapAttr: [conf.speechOverlapAttr[0], conf.speechOverlapAttr[1]],
                speechOverlapVal: conf.speechOverlapVal,
                speakerColors: pipe(
                    List.repeat(v => v, 10),
                    List.map(v => Color.importColor(0.9, colorGen(v)))
                ),
                wideCtxGlobals: [],
                speakerColorsAttachments: {},
                spkOverlapMode: (conf.speechOverlapAttr || [])[1] ? 'full' : 'simple',
                expandLeftArgs: [],
                expandRightArgs: [],
                data: [],
                availTokens: [],
                tokenIdx: 0,
                kwicNumTokens: 1,
                backlink: null,
                playback: null,
                maxNumSpeeches: conf.maxNumSpeeches || SpeechesTile.DEFAULT_MAX_NUM_SPEECHES
            }
        });
        this.view = viewInit(dispatcher, ut, theme, this.model);
    }

    getLabel():string {
        return this.label;
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    getSourceInfoComponent():null {
        return null;
    }

    /**
     */
    supportsQueryType(qt:QueryType, domain1:string, domain2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY;
    }

    disable():void {
        this.model.waitForAction({}, (_, sd) => sd);
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return true;
    }

    supportsAltView():boolean {
        return false;
    }

    supportsSVGFigureSave():boolean {
        return false;
    }

    getAltViewIcon():AltViewIconProps {
        return DEFAULT_ALT_VIEW_ICON;
    }

    registerReloadModel(model:ITileReloader):boolean {
        model.registerModel(this, this.model);
        return true;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory<SpeechesTileConf> = {

    sanityCheck: (args) => [],

    create: (args) => new SpeechesTile(args)
};
