/*
 * Copyright 2020 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import { Dict, List } from 'cnc-tskit';
import * as path from 'path';
import { Ajv } from 'ajv';
import * as fs from 'fs';
import { DomainAnyTileConf, ServerConf } from './index.js';
import { QueryType } from '../query/index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CORE_TILES_ROOT_DIR = path.resolve(__dirname, '../tiles/core');

const CUSTOM_TILES_ROOT_DIR = path.resolve(__dirname, '../tiles/custom');

const SCHEMA_FILENAME = 'config-schema.json';


export function validateTilesConf(tilesConf:DomainAnyTileConf):boolean {
    const validator = new Ajv();
    let validationError = false;

    console.info('Validating tiles configuration...');

    Dict.forEach((tiles, domain) => {
        Dict.forEach((tileConf, tileName) => {
            let configSchema:{};
            const tileType = tileConf.tileType + '';
            const folderName = tileType[0].toLowerCase() + tileType.slice(1).split('Tile')[0];
            const confPath = path.resolve(CORE_TILES_ROOT_DIR, folderName, SCHEMA_FILENAME);
            if (fs.existsSync(confPath)) {
                configSchema = JSON.parse(fs.readFileSync(confPath, 'utf-8'));

            } else {
                const confPath = path.resolve(CUSTOM_TILES_ROOT_DIR, folderName, SCHEMA_FILENAME);
                if (fs.existsSync(confPath)) {
                    configSchema = JSON.parse(fs.readFileSync(confPath, 'utf-8'));
                }
            }
            if (!configSchema) {
                console.info(`  ${domain}/${tileName} [\x1b[31m FAIL \x1b[0m]`);
                console.info(`    \u25B6 schema "${tileType}" not found`);
                validationError = true;

            } else if (validator.validate(configSchema, tileConf)) {
                console.info(`  ${domain}/${tileName} [\x1b[32m OK \x1b[0m]`);

            } else {
                console.info(`  ${domain}/${tileName} [\x1b[31m FAIL \x1b[0m]`);
                List.forEach(
                    err => {
                        console.error(`    \u25B6 ${err.message}`)
                    },
                    validator.errors
                );
                validationError = true;
            }
        }, tiles);
    }, tilesConf);
    if (validationError) {
        return false;
    }
    console.info('...\uD83D\uDC4D All the tiles are valid');
    return true;
}

export function maxQueryWordsForQueryType(conf:ServerConf, qt:QueryType):number {
    switch (qt) {
        case QueryType.SINGLE_QUERY:
            return conf?.freqDB?.single?.maxQueryWords || 1;
        case QueryType.CMP_QUERY:
            return conf?.freqDB?.cmp?.maxQueryWords || 1;
        case QueryType.TRANSLAT_QUERY:
            return conf?.freqDB?.translat?.maxQueryWords || 1;
        default:
            throw new Error(`Unknown query type ${qt}`);
    }
}
