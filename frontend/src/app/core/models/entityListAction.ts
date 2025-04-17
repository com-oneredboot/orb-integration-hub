// file: frontend/src/app/core/models/entityListAction.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

import {NONE_TYPE} from "@angular/compiler";

export enum EntityListActionEnum {
    ADD,
    REMOVE,
    SELECTED,
    NONE
}

export interface IEntityListAction {
    action: EntityListActionEnum;
    entity: any;
} 