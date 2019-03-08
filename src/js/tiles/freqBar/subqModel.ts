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

import { FreqBarModel, FreqBarModelState } from './model';
import { ActionDispatcher, Action, SEDispatcher } from 'kombo';
import { AppServices } from '../../appServices';
import { MultiBlockFreqDistribAPI, APIBlockResponse, ApiDataBlock } from '../../common/api/kontextFreqs';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import { Backlink, isSubqueryPayload, SubqueryPayload } from '../../common/types';
import { ConcApi, ViewMode, RequestArgs, ConcResponse, QuerySelector } from '../../common/api/concordance';
import { Observable, forkJoin } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { stateToAPIArgs } from '../../common/models/freq';
import { DataLoadedPayload } from './actions';

/**
 * SubqueryModeConf defines a special part
 * of the tile configuration which makes it
 * able to search for provided subquieries
 * in custom concordances.
 *
 * E.g. TreqTile produces some translations
 * and we want to find some freq. info
 * for most relevant ones (= subqueries).
 */
export interface SubqueryModeConf {
    concApiURL:string;
    langMapping:{[lang:string]:string};
}

/**
 * SubqFreqBarModel is an extension of FreqBarModel
 * which produces its own concordances for provided
 * subqueries and then combines the results into
 * a single one (= multiple blocks/charts).
 *
 * To be able to use this tile there must exist at
 * least one other tile which generates 'TileDataLoaded'
 * action with 'SubqueryPayload'.
 */
export class SubqFreqBarModel extends FreqBarModel {

    private readonly subqConf:SubqueryModeConf;

    private readonly concApi:ConcApi;

    constructor(dispatcher:ActionDispatcher, tileId:number, waitForTile:number, appServices:AppServices, api:MultiBlockFreqDistribAPI,
            backlink:Backlink|null, initState:FreqBarModelState, subqConf:SubqueryModeConf) {
        super(dispatcher, tileId, waitForTile, appServices, api, backlink, initState);
        this.subqConf = subqConf;
        this.concApi = new ConcApi(subqConf.concApiURL, appServices.getApiHeaders(subqConf.concApiURL));
    }


    private loadFreq(state:FreqBarModelState, corp:string, query:string):Observable<APIBlockResponse> {
        return this.concApi.call({
            corpname: corp,
            kwicleftctx: '-1',
            kwicrightctx: '1',
            async: '1',
            pagesize: '5',
            fromp: '1',
            attr_vmode: 'mouseover', // TODO,
            attrs: 'word',
            viewmode: ViewMode.KWIC,
            shuffle: 0,
            queryselector: QuerySelector.LEMMA, // TODO ??
            lemma: query, // TODO
            format:'json'
        } as RequestArgs)
        .pipe(
            concatMap((v:ConcResponse) => this.api.call(stateToAPIArgs(state, v.conc_persistence_op_id)))
        );
    }

    sideEffects(state:FreqBarModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend((action:Action) => {
                    if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile
                            && isSubqueryPayload(action.payload)) {
                        const payload:SubqueryPayload = action.payload;
                        const subqueries = payload.subqueries.slice(0, 2);
                        forkJoin(
                            subqueries.map(
                                subq => this.loadFreq(
                                    state,
                                    this.subqConf.langMapping[payload.lang2],
                                    subq
                                )
                            )
                        ).subscribe(
                            (data) => {
                                const combined:Array<ApiDataBlock> = [];
                                combined.push(data[0].blocks[0]);
                                combined.push(data[1].blocks[0]);

                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: combined.every(v => v.data.length === 0),
                                        blocks: combined.map(block => {
                                            return {
                                                data: block.data.sort(((x1, x2) => x1.name.localeCompare(x2.name))).slice(0, state.maxNumCategories),
                                            }
                                        }),
                                        blockLabels: subqueries,
                                        concId: null // TODO do we need this?
                                    }
                                });
                            },
                            (err) => {
                                console.log('err: ', err);
                            }
                        );
                        return true;
                    }
                    return false;
                });
            break;
        }
    }
}

export const factory =
    (
        subqConf:SubqueryModeConf) =>
    (
        dispatcher:ActionDispatcher,
        tileId:number,
        waitForTile:number,
        appServices:AppServices,
        api:MultiBlockFreqDistribAPI,
        backlink:Backlink|null,
        initState:FreqBarModelState) => {

        return new SubqFreqBarModel(dispatcher, tileId, waitForTile, appServices, api, backlink,
                initState, subqConf);

    };