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
import { Action } from 'kombo';
import { DataRow, DataHeading, SrchContextType } from '../../../api/abstract/collocations.js';
import { SubqueryPayload, RangeRelatedSubqueryValue } from '../../../query/index.js';
import { Actions as GlobalActions } from '../../../models/actions.js';


export enum CollocMetric {
    T_SCORE = 't',
    MI = 'm',
    MI3 = '3',
    LOG_LKL = 'l',
    MIN_SENS = 's',
    LOG_DICE = 'd',
    MI_LOG_F = 'p',
    REL_FREQ = 'f'
}

export interface DataLoadedPayload extends SubqueryPayload<RangeRelatedSubqueryValue> {
    data:Array<DataRow>;
    heading:DataHeading;
    concId:string;
    queryId:number;
}


export class Actions {

    static SetSrchContextType:Action<{
        tileId:number;
        ctxType:SrchContextType;
    }> = {
        name: 'COLLOCATIONS_SET_SRCH_CONTEXT_TYPE'
    };

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & {}> = {
        name: GlobalActions.TileDataLoaded.name
    };

    static isTileDataLoaded(a:Action):a is typeof Actions.TileDataLoaded {
        return a.name === GlobalActions.TileDataLoaded.name &&
            a.payload['data'] && a.payload['heading'] && a.payload['concId'] && a.payload['queryId'];
    }

    static PartialTileDataLoaded:Action<typeof GlobalActions.TilePartialDataLoaded.payload & DataLoadedPayload> = {
        name: GlobalActions.TilePartialDataLoaded.name
    };

}