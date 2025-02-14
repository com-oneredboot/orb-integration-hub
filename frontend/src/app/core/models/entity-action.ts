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