/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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

import * as Rx from '@reactivex/rxjs';
import { DataApi } from '../../abstract/types';


export interface DataRow {
    name:string;
    value:number;
}


export type APIResponse = Array<DataRow>;


export interface QueryArgs {

}

export class DummyAPI implements DataApi<QueryArgs, APIResponse> {

    constructor() {

    }


    call(args:QueryArgs):Rx.Observable<APIResponse> {
        return Rx.Observable.of([
            {name: 'ADM', value: 3419},
            {name: 'LEI', value: 2811},
            {name: 'MEM', value: 831},
            {name: 'NEW', value: 17942},
            {name: 'NOW', value: 809},
            {name: 'POP', value: 11789}
        ]).delay(1500);
    }
}