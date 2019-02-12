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
import * as Immutable from 'immutable';
import { TileConf, ITileProvider, TileComponent, QueryType, TileFactory } from '../../abstract/types';
import { AppServices } from '../../appServices';
import { SummaryModel, FlevelDistribItem } from './model';
import {init as viewInit} from './view';
import { LemmaFreqApi, SummaryDataRow } from './api';
import { SimilarFreqWordsApi, SimilarlyFreqWord } from './sfwApi';
declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface SummaryTileConf extends TileConf {
    tileType:'SummaryTile';
    apiURL:string;
    sfwApiURL:string;
    corpname:string;
    corpusSize:number;
    fcrit:string;
    flimit:number;
    freqSort:string;
    fpage:number;
    fttIncludeEmpty:boolean;
    flevelDistrib?:Array<FlevelDistribItem>;
}

const defaultFlevelDistrib = [
    {rel: 71.5079, flevel: 1.0}, {rel: 19.9711, flevel: 2.0}, {rel: 6.2886, flevel: 3.0},
    {rel: 1.8387, flevel: 4.0}, {rel: 0.3606, flevel: 5.0}, {rel: 0.0293, flevel: 6.0},
    {rel: 0.0037, flevel: 7.0}
];

export class SummaryTile implements ITileProvider {

    private readonly tileId:number;

    private readonly label:string;

    private readonly appServices:AppServices;

    private readonly model:SummaryModel;

    private readonly widthFract:number;

    private view:TileComponent;

    constructor(lang1:string, lang2:string, {tileId, dispatcher, appServices, ut, mainForm, waitForTile, widthFract, conf}:TileFactory.Args<SummaryTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.label = this.appServices.importExternalMessage(conf.label);
        this.model = new SummaryModel(
            dispatcher,
            {
                isBusy: false,
                error: null,
                corpname: conf.corpname,
                corpusSize: conf.corpusSize,
                concId: null,
                fcrit: conf.fcrit,
                flimit: conf.flimit,
                fpage: conf.fpage,
                freqSort: conf.freqSort,
                includeEmpty: conf.fttIncludeEmpty,
                data: Immutable.List<SummaryDataRow>(),
                currLemmaIdx: -1,
                flevelDistrb: Immutable.List<FlevelDistribItem>(
                    conf.flevelDistrib ? conf.flevelDistrib : defaultFlevelDistrib
                ),
                similarFreqWords: Immutable.List<SimilarlyFreqWord>()
            },
            new LemmaFreqApi(conf.apiURL),
            new SimilarFreqWordsApi(conf.sfwApiURL),
            waitForTile,
            appServices
        );
        this.view = viewInit(
            dispatcher,
            ut,
            this.model
        );
    }

    init():void {
    }

    getIdent():number {
        return this.tileId;
    }

    getLabel():string {
        return this.label ? this.label : this.appServices.translate('freqpie__main_label');
    }

    getView():TileComponent {
        return this.view;
    }

    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY;
    }

    disable():void {
        this.model.suspend(()=>undefined);
    }

    isHidden():boolean {
        return false;
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return false;
    }

    supportsHelpView():boolean {
        return true;
    }
}


export const init:TileFactory.TileFactory<SummaryTileConf> = ({
    tileId, dispatcher, appServices, ut, mainForm, lang1, lang2, waitForTile, widthFract, conf}) => {
    return new SummaryTile(lang1, lang2, {tileId, dispatcher, appServices, ut, mainForm, widthFract, waitForTile, conf});
}