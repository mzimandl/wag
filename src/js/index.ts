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

import { ActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {init as viewInit} from './views/main';
import { WdglanceMainFormModel } from './models/main';
import {init as concInit} from './tiles/concordance/index';
import {init as freqInit} from './tiles/ttDistrib/index';
import { GlobalComponents, init as globalCompInit } from './views/global';

declare var require:(src:string)=>void;
require('../css/index.css'); // webpack


export interface WdglanceConf {
    mountElement:HTMLElement;
    uiLang:string;
}

export const init = ({mountElement, uiLang}:WdglanceConf) => {
    const dispatcher = new ActionDispatcher();
    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLang || 'en_US',
        translations: this.translations,

    });
    const globalComponents = globalCompInit(dispatcher, viewUtils);
    viewUtils.attachComponents(globalComponents);
    const model = new WdglanceMainFormModel(
        dispatcher,
        [
            ['cs_CZ', 'česky'],
            ['en_US', 'English']
        ]
    );
    const component = viewInit(dispatcher, viewUtils, model);

    // window conc.
    const concTile = concInit(dispatcher, viewUtils, model);

    // window freq.
    const freqTile = freqInit(0, dispatcher, viewUtils, model);


    ReactDOM.render(
        React.createElement(
            component.WdglanceMain,
            {
                window0: freqTile.getView(),
                window0Label: 'Text types',
                window1: null,
                window1Label: 'Collocations',
                window2: null,
                window2Label: 'Treq',
                window3: concTile.getView(),
                window3Label: 'Concordance',
            }
        ),
        mountElement
    );
};