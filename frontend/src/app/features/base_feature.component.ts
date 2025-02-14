// file: frontend/src/app/features/base_feature.component.ts
// author: Corey Peters
// created: 2025-01-03
// description: Base store component for the application

// 3rd party imports
import {AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import { Observable, Subscription} from "rxjs";
import { select, Store } from "@ngrx/store";
import {Router} from "@angular/router";

// Application imports
import { AppState } from "../store/app.state";
import { CognitoService } from "../core/services/cognito.service";
import { CognitoUser } from "../core/models/cognito.model";
import { UserService } from "../core/services/user.service";
import { User } from "../core/models/user.model";
import { selectUser } from "../store/app.selector";
import {updateUser} from "./user/store/user.actions";

@Component({
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaseFeatureComponent implements OnInit, OnDestroy, AfterViewInit {

    // Subscriptions
    public user$: Observable<User | null>;

    // Subscriptions
    protected subscription?: Subscription;

    /**
     * Constructor
     * @param router
     * @param store
     * @param userService
     */
    constructor(protected router: Router,
                protected store: Store<AppState>,
                protected userService: UserService) {

        console.debug('BaseFeatureStoreComponent::Constructor');

        // Subscribe to the Store
        this.user$ = this.store.pipe(select(selectUser));
    }

    /**
     * Initialize the component
     */
    public async ngOnInit(): Promise<void> {
        // Get User Information
        console.debug('BaseFeatureComponent::ngOnInit');

        // Setup Subscriptions
        this.subscription = new Subscription();

        // listen to the user$
        this.subscription?.add(this.user$?.subscribe(async (user) => {
            console.debug('BaseFeatureComponent::ngOnInit::user: ', user);
            if (user) {
                await this.onUser$Updated(user);
            }
        }));

        let currentUser = this.userService.getCurrentUser$();

        this.store.dispatch(updateUser({ user: currentUser }));

    }

    public async ngOnDestroy(): Promise<void> {
        console.debug('BaseFeatureComponent::ngOnDestroy');

        // unsubscribe from the subscription
        this.subscription?.unsubscribe();
    }

    public async ngAfterViewInit(): Promise<void> {
        console.debug('BaseFeatureComponent::ngAfterViewInit');
    }

    protected async onUser$Updated(user: User): Promise<void> {
        console.debug('BaseFeatureComponent::onUser$Updated::User: ', user);
    }

}
