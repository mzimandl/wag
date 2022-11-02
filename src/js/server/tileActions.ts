/*
 * Copyright 2022 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2022 Institute of the Czech National Corpus,
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

import { HTTP } from 'cnc-tskit';
import { RequestHandler } from 'express';

/**
 * TileServerAction defines a custom action which can be defined
 * by a tile.
 * Please note that the final path of the action is composed
 * from 1) installation base URL, 2) tile name (e.g. ConcFilterTile)
 * and 3) name.
 * So the result may e.g. look like: /my-wag/ConcFilterTile/sign-in
 */
export interface TileServerAction {
    method:HTTP.Method;
    name:string;
    handler:RequestHandler;
}