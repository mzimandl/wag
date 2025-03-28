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
import { Observable, of as rxOf } from 'rxjs';
import { ajax$ } from '../../../page/ajax.js';
import { SourceDetails } from '../../../types.js';
import { WordSimApiResponse, WordSimWord, IWordSimApi } from '../../abstract/wordSim.js';
import { map } from 'rxjs/operators';
import { WordSimModelState, OperationMode } from '../../../models/tiles/wordSim.js';
import { QueryMatch } from '../../../query/index.js';
import { IApiServices } from '../../../appServices.js';


type DatamuseMLApiResponse = Array<WordSimWord>;


export interface DatamuseMLApiArgs {
    ml:string;
    max:number;
}

export interface DatamuseSLApiArgs {
    sl:string;
    max:number;
}

export type DatamuseApiArgs = DatamuseMLApiArgs | DatamuseSLApiArgs;


export class DatamuseMLApi implements IWordSimApi<DatamuseMLApiArgs|DatamuseSLApiArgs> {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    constructor(apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
    }

    stateToArgs(state:WordSimModelState, queryMatch:QueryMatch):DatamuseMLApiArgs|DatamuseSLApiArgs {
        switch (state.operationMode) {
            case OperationMode.MeansLike:
                return {ml: queryMatch.lemma, max: state.maxResultItems};
            case OperationMode.SoundsLike:
                return {sl: queryMatch.lemma, max: state.maxResultItems};
        }
    }

    supportsTweaking():boolean {
        return true;
    }

    supportsMultiWordQueries():boolean {
        return false;
    }

    getSourceDescription(tileId:number, multicastRequest:boolean, corpname:string):Observable<SourceDetails> {
        return rxOf({
            tileId: tileId,
            title: 'Datamuse.com',
            description: 'The Datamuse API is a word-finding query engine for developers. ' +
                         'You can use it in your apps to find words that match a given set of constraints ' +
                         'and that are likely in a given context. You can specify a wide variety of constraints ' +
                         'on meaning, spelling, sound, and vocabulary in your queries, in any combination.',
            author: 'Datamuse.com',
            href: 'https://www.datamuse.com',
            structure: {
                numTokens: 0 // TODO
            }
        });
    }

    call(tileId:number, multicastRequest:boolean, queryArgs:DatamuseApiArgs):Observable<WordSimApiResponse> {
        return ajax$<DatamuseMLApiResponse>(
            'GET',
            this.apiURL,
            queryArgs,
            {headers: this.apiServices.getApiHeaders(this.apiURL)}

        ).pipe(
            map(resp => ({words: resp}))
        );
    }

}

