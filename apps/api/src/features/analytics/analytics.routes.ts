import type { AnalyticsReader } from '@fifilo/core/analytics'
import {
  balanceEvolutionQuerySchema,
  balanceEvolutionResponseSchema,
  consolidatedBalanceQuerySchema,
  consolidatedBalanceResponseSchema,
  getBalanceEvolution,
  getConsolidatedBalance,
  getMonthlyCashflow,
  getSpendByAccount,
  getSpendByCategory,
  getTopExpenses,
  monthlyCashflowQuerySchema,
  monthlyCashflowResponseSchema,
  spendByAccountQuerySchema,
  spendByAccountResponseSchema,
  spendByCategoryQuerySchema,
  spendByCategoryResponseSchema,
  topExpensesQuerySchema,
  topExpensesResponseSchema,
} from '@fifilo/core/analytics'
import type { EntityId } from '@fifilo/core/primitives'
import { Elysia } from 'elysia'

import { toHttpErrorResponse } from '../../libs/domain-error-status'
import { errorStatuses, mapValidationError } from '../../libs/http-errors'
import type { ActorResolver } from '../auth'
import { createAuthGuard, requireActorContext } from '../auth'
import { createAnalyticsReader } from './repository'

/**
 * A financial projection is the requesting user's own data, never a shared
 * resource - `private` keeps it out of any shared cache (Fase 05 §
 * API). `must-revalidate` plus a body-derived `ETag` still lets a browser
 * skip the transfer on an unchanged period without ever serving stale data.
 */
const applyAnalyticsCaching = (
  set: { headers: Record<string, string | number> },
  body: unknown,
): void => {
  set.headers['cache-control'] = 'private, max-age=0, must-revalidate'
  set.headers.etag = `"${Bun.hash(JSON.stringify(body)).toString(36)}"`
}

export type AnalyticsRouteDependencies = {
  analyticsReader?: AnalyticsReader
  resolveActor?: ActorResolver
}

export const createAnalyticsRoutes = ({
  analyticsReader = createAnalyticsReader(),
  resolveActor,
}: AnalyticsRouteDependencies = {}) =>
  new Elysia({ prefix: '/api/analytics' })
    .onError(mapValidationError)
    .use(createAuthGuard({ resolveActor }))
    .get(
      '/monthly-cashflow',
      async ({ actorContext, query, set }) => {
        const context = requireActorContext(actorContext)
        const result = await getMonthlyCashflow(
          { from: query.from, organizationId: context.organizationId, to: query.to },
          analyticsReader,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        applyAnalyticsCaching(set, result.value)
        return result.value
      },
      {
        query: monthlyCashflowQuerySchema,
        response: { 200: monthlyCashflowResponseSchema, ...errorStatuses },
      },
    )
    .get(
      '/spend-by-category',
      async ({ actorContext, query, set }) => {
        const context = requireActorContext(actorContext)
        const result = await getSpendByCategory(
          {
            from: query.from,
            kind: query.kind,
            organizationId: context.organizationId,
            to: query.to,
          },
          analyticsReader,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        applyAnalyticsCaching(set, result.value)
        return result.value
      },
      {
        query: spendByCategoryQuerySchema,
        response: { 200: spendByCategoryResponseSchema, ...errorStatuses },
      },
    )
    .get(
      '/spend-by-account',
      async ({ actorContext, query, set }) => {
        const context = requireActorContext(actorContext)
        const result = await getSpendByAccount(
          { from: query.from, organizationId: context.organizationId, to: query.to },
          analyticsReader,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        applyAnalyticsCaching(set, result.value)
        return result.value
      },
      {
        query: spendByAccountQuerySchema,
        response: { 200: spendByAccountResponseSchema, ...errorStatuses },
      },
    )
    .get(
      '/balance-evolution',
      async ({ actorContext, query, set }) => {
        const context = requireActorContext(actorContext)
        const result = await getBalanceEvolution(
          {
            accountId: query.accountId as EntityId | undefined,
            from: query.from,
            organizationId: context.organizationId,
            to: query.to,
          },
          analyticsReader,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        applyAnalyticsCaching(set, result.value)
        return result.value
      },
      {
        query: balanceEvolutionQuerySchema,
        response: { 200: balanceEvolutionResponseSchema, ...errorStatuses },
      },
    )
    .get(
      '/consolidated-balance',
      async ({ actorContext, query, set }) => {
        const context = requireActorContext(actorContext)
        const result = await getConsolidatedBalance(
          { asOf: query.asOf, organizationId: context.organizationId },
          analyticsReader,
        )
        // `getConsolidatedBalance` never fails (its error type is `never`);
        // this satisfies the type-level narrowing `result.value` needs.
        if (!result.ok) return result.error

        applyAnalyticsCaching(set, result.value)
        return result.value
      },
      {
        query: consolidatedBalanceQuerySchema,
        response: { 200: consolidatedBalanceResponseSchema },
      },
    )
    .get(
      '/top-expenses',
      async ({ actorContext, query, set }) => {
        const context = requireActorContext(actorContext)
        const result = await getTopExpenses(
          {
            from: query.from,
            limit: query.limit,
            organizationId: context.organizationId,
            to: query.to,
          },
          analyticsReader,
        )

        if (!result.ok) {
          const httpError = toHttpErrorResponse(result.error)
          set.status = httpError.status
          return httpError.body
        }

        applyAnalyticsCaching(set, result.value)
        return result.value
      },
      {
        query: topExpensesQuerySchema,
        response: { 200: topExpensesResponseSchema, ...errorStatuses },
      },
    )
