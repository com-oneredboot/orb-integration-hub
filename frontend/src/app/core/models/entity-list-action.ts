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