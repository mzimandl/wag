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
import { IAppServices } from '../../../appServices.js';
import { QueryType } from '../../../query/index.js';
import { AltViewIconProps, DEFAULT_ALT_VIEW_ICON, ITileProvider, ITileReloader, TileComponent, TileConf, TileFactory, TileFactoryArgs } from '../../../page/tile.js';
import { createSyDInstance } from './api.js';
import { SydModel } from './model.js';
import { init as viewInit } from './view.js';
import { CoreApiGroup } from '../../../api/coreGroups.js';


export interface SyDTileConf extends TileConf {
    apiType:string;
    apiURL:string;
    concApiURL:string;
    corp1:string;
    corp1Fcrit:Array<string>;
    corp2:string;
    corp2Fcrit:Array<string>;
}

/**
 *
 */
export class SyDTile implements ITileProvider {

    private readonly tileId:number;

    private readonly view:TileComponent;

    private readonly model:SydModel;

    private readonly appServices:IAppServices;

    private readonly widthFract:number;

    private readonly label:string;

    private readonly blockingTiles:Array<number>;

    constructor({
        dispatcher, tileId, waitForTiles, ut, queryMatches, appServices, widthFract, conf,
        isBusy
    }:TileFactoryArgs<SyDTileConf>) {
        this.tileId = tileId;
        this.appServices = appServices;
        this.widthFract = widthFract;
        this.blockingTiles = waitForTiles;
        const apiOptions = conf.apiType === CoreApiGroup.KONTEXT_API ?
            {authenticateURL: appServices.createActionUrl("/SyDTile/authenticate")} :
            {};
        this.model = new SydModel(
            dispatcher,
            {
                isBusy: isBusy,
                error: null,
                procTime: -1,
                corp1: conf.corp1,
                corp1Fcrit: [...conf.corp1Fcrit],
                corp2: conf.corp2,
                corp2Fcrit: [...conf.corp2Fcrit],
                flimit: 1, // TODO
                freqSort: '', // TODO
                fpage: 1, // TODO
                fttIncludeEmpty: false,
                result: []
            },
            tileId,
            waitForTiles[0],
            queryMatches,
            appServices,
            createSyDInstance(conf.apiType, conf.apiURL, conf.concApiURL, appServices, apiOptions),
        );
        this.label = appServices.importExternalMessage(conf.label || 'syd_main_label');
        this.view = viewInit(dispatcher, ut, this.model);
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

    getLabel():string {
        return this.label;
    }

    supportsQueryType(qt:QueryType, domain1:string, domain2?:string):boolean {
        return qt === QueryType.CMP_QUERY;
    }

    disable():void {
        this.model.waitForAction({}, (_, syncData)=>syncData);
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return false;
    }

    supportsAltView():boolean {
        return false;
    }

    supportsSVGFigureSave():boolean {
        return false;
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

    getAltViewIcon():AltViewIconProps {
        return DEFAULT_ALT_VIEW_ICON;
    }
}

export const init:TileFactory<SyDTileConf> = {

    sanityCheck: (args) => [],

    create: (args) => new SyDTile(args)
};
