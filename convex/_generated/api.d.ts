/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as households from "../households.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_lists from "../lib/lists.js";
import type * as lib_optional from "../lib/optional.js";
import type * as lib_seed from "../lib/seed.js";
import type * as lib_shops from "../lib/shops.js";
import type * as lib_svix from "../lib/svix.js";
import type * as lib_units from "../lib/units.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lists from "../lists.js";
import type * as migrations from "../migrations.js";
import type * as plans from "../plans.js";
import type * as recipes from "../recipes.js";
import type * as shops from "../shops.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  households: typeof households;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/dates": typeof lib_dates;
  "lib/lists": typeof lib_lists;
  "lib/optional": typeof lib_optional;
  "lib/seed": typeof lib_seed;
  "lib/shops": typeof lib_shops;
  "lib/svix": typeof lib_svix;
  "lib/units": typeof lib_units;
  "lib/validation": typeof lib_validation;
  lists: typeof lists;
  migrations: typeof migrations;
  plans: typeof plans;
  recipes: typeof recipes;
  shops: typeof shops;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
