// file: frontend/src/app/core/models/entity-list-action.ts
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