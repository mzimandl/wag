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

import {IActionDispatcher, Action, StatefulModel, IStatelessModel} from 'kombo';
import {Observable, Subscription, BehaviorSubject} from 'rxjs';
import {startWith, scan} from 'rxjs/operators';


export class ServerSideActionDispatcher implements IActionDispatcher {

    private readonly actions:Observable<Action<{}>>;

    constructor() {
        this.actions = new Observable<Action<{}>>();
    }

    dispatch<T extends Action | Observable<Action>>(action: T): void {

    }

    registerStatefulModel<T>(model: StatefulModel<T>): Subscription {
        return this.actions.subscribe(model.onAction.bind(model));
    }

    registerModel<T>(model: IStatelessModel<T>, initialState: T): BehaviorSubject<T> {
        const state$ = new BehaviorSubject(initialState);
        this.actions.pipe(
            startWith(null),
            scan(
                (state:T, action:Action<{}>) => {
                    if (action !== null) {
                        model.wakeUp(action);
                        if (model.isActive()) {
                            const newState = model.reduce(state, action);
                            if (!action.isSideEffect) {
                                // TODO ...
                            }
                            return newState;
                        }
                    }
                    return state;
                },
                initialState
            )
        ).subscribe(state$);
        return state$;
    }
}