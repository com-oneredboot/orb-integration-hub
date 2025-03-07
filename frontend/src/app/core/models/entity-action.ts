// file: frontend/src/app/core/models/entity-action.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

export enum EntityActionEnum {
    CREATE,
    READ,
    UPDATE,
    DELETE,
    NONE
}

export interface IEntityAction {
    action: EntityActionEnum;
    entity: any;
}