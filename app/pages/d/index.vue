<script setup lang="ts">
import type {
    UIPlan,
    UISubscription,
    PlansResponse,
    SubscriptionsResponse,
} from "~/types/api";
import type { StatusCode, BillingPeriod, CurrencyCode } from "@core/domain";

useHead({ title: "sub — Dashboard" });

const route = useRoute();
const userId = computed(() => (route.query.userId as string) || "demo");

const { data: plansData, status: plansStatus } = await useFetch<PlansResponse>(
    "/api/plans",
    { query: { all: "true" } },
);
const {
    data: subsData,
    status: subsStatus,
    refresh: refreshSubs,
} = await useFetch<SubscriptionsResponse>("/api/subscriptions", {
    query: computed(() => ({ userId: userId.value })),
});

const plans = computed<UIPlan[]>(() => plansData.value?.plans ?? []);
const subs = computed<UISubscription[]>(
    () => subsData.value?.subscriptions ?? [],
);

const planMap = computed(() => {
    const m: Record<string, UIPlan> = {};
    for (const p of plans.value) m[p.id] = p;
    return m;
});

function formatPlanAmount(plan: UIPlan | undefined): string {
    if (!plan) return "—";
    return formatMoney(plan.price.amountMinor, plan.price.currency);
}

const MINOR_UNITS: Record<CurrencyCode, number> = {
    USD: 100,
    EUR: 100,
    GBP: 100,
    AUD: 100,
    CAD: 100,
    SGD: 100,
    JPY: 1,
    VND: 1,
};
function formatMoney(amountMinor: number, currency: CurrencyCode): string {
    const units = MINOR_UNITS[currency] ?? 100;
    const major = amountMinor / units;
    return `${major.toFixed(units === 1 ? 0 : 2)} ${currency}`;
}

const activeSubs = computed(() =>
    subs.value.filter((s) => s.status === "active" || s.status === "trialing"),
);

const monthlySpend = computed(() => {
    let total = 0;
    let currency: CurrencyCode = "USD";
    for (const s of activeSubs.value) {
        const plan = planMap.value[s.planId];
        if (!plan) continue;
        currency = plan.price.currency;
        const units = MINOR_UNITS[currency];
        const annualFreq: Record<BillingPeriod, number> = {
            weekly: 52 / 12,
            monthly: 1,
            quarterly: 1 / 3,
            biannual: 1 / 6,
            yearly: 1 / 12,
        };
        total +=
            (plan.price.amountMinor / units) *
            (annualFreq[plan.billingCycle] ?? 1);
    }
    return total;
});

const nextBilling = computed(() => {
    const dates = activeSubs.value.map((s) => s.currentPeriodEnd).sort();
    return dates[0] ? dates[0].slice(0, 10) : "—";
});

const stats = computed(() => [
    {
        label: "Active subs",
        value: String(activeSubs.value.length),
        delta: `${subs.value.length} total`,
        color: "var(--green)",
    },
    {
        label: "Monthly spend",
        value: `$${monthlySpend.value.toFixed(2)}`,
        delta: "across active plans",
        color: "var(--peach)",
    },
    {
        label: "Next billing",
        value: nextBilling.value,
        delta: "earliest renewal",
        color: "var(--yellow)",
    },
    {
        label: "Plans available",
        value: String(plans.value.length),
        delta: "in catalog",
        color: "var(--sapphire)",
    },
]);

const search = ref("");
const filteredSubs = computed(() => {
    const q = search.value.toLowerCase();
    return subs.value.filter((s) => {
        const plan = planMap.value[s.planId];
        return !q || (plan?.name ?? s.planId).toLowerCase().includes(q);
    });
});

const statusColor: Record<StatusCode, string> = {
    active: "var(--green)",
    trialing: "var(--sapphire)",
    paused: "var(--fg-subtext0)",
    past_due: "var(--yellow)",
    cancelled: "var(--red)",
    expired: "var(--red)",
};

const loading = computed(
    () => plansStatus.value === "pending" || subsStatus.value === "pending",
);
</script>

<template>
    <div class="page">
        <div class="page-header">
            <div>
                <h1 class="page-title">Dashboard</h1>
                <p class="page-sub">
                    Subscriptions for user <code>{{ userId }}</code>
                </p>
            </div>
            <button class="btn-add" type="button">
                <span aria-hidden="true">+</span>
                Add subscription
            </button>
        </div>

        <div v-if="loading" class="loading">Loading…</div>

        <template v-else>
            <div class="stats-grid">
                <div v-for="stat in stats" :key="stat.label" class="stat-card">
                    <div class="stat-label">{{ stat.label }}</div>
                    <div class="stat-value" :style="{ color: stat.color }">
                        {{ stat.value }}
                    </div>
                    <div class="stat-delta">{{ stat.delta }}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-head">
                    <h2 class="section-title">Subscriptions</h2>
                    <div class="section-actions">
                        <input
                            v-model="search"
                            type="search"
                            class="search"
                            placeholder="Search…"
                            aria-label="Search subscriptions"
                        />
                    </div>
                </div>

                <div v-if="filteredSubs.length === 0" class="empty">
                    No subscriptions found.
                </div>

                <div v-else class="table-wrap">
                    <table class="table" aria-label="Subscriptions list">
                        <thead>
                            <tr>
                                <th>Plan</th>
                                <th>Cycle</th>
                                <th>Amount</th>
                                <th>Next billing</th>
                                <th>Status</th>
                                <th><span class="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="sub in filteredSubs"
                                :key="sub.id"
                                class="sub-row"
                            >
                                <td>
                                    <div class="sub-name">
                                        <span>{{
                                            planMap[sub.planId]?.name ??
                                            sub.planId
                                        }}</span>
                                    </div>
                                </td>
                                <td class="muted">
                                    {{
                                        planMap[sub.planId]?.billingCycle ?? "—"
                                    }}
                                </td>
                                <td class="amount">
                                    {{ formatPlanAmount(planMap[sub.planId]) }}
                                </td>
                                <td class="muted">
                                    {{ sub.currentPeriodEnd.slice(0, 10) }}
                                </td>
                                <td>
                                    <span
                                        class="status-badge"
                                        :style="{
                                            color: statusColor[sub.status],
                                            borderColor:
                                                statusColor[sub.status],
                                        }"
                                    >
                                        {{ sub.status }}
                                    </span>
                                </td>
                                <td>
                                    <div class="row-actions">
                                        <button
                                            class="action-btn"
                                            type="button"
                                            title="Edit"
                                            aria-label="Edit subscription"
                                        >
                                            ✎
                                        </button>
                                        <button
                                            class="action-btn danger"
                                            type="button"
                                            title="Cancel"
                                            aria-label="Cancel subscription"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 24px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    gap: 16px;
}
.page-title {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--fg-text);
    margin: 0 0 4px;
}
.page-sub {
    font-size: 14px;
    color: var(--fg-subtext0);
    margin: 0;
}
.page-sub code {
    font-family: monospace;
    background: var(--bg-surface0);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    font-size: 12px;
}

.btn-add {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    background: var(--accent);
    color: var(--bg-crust);
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
}
.btn-add:hover {
    background: var(--accent-hover);
}

.loading {
    color: var(--fg-subtext0);
    font-size: 14px;
    padding: 40px 0;
    text-align: center;
}

.empty {
    color: var(--fg-subtext0);
    font-size: 14px;
    padding: 40px;
    text-align: center;
    background: var(--bg-mantle);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 40px;
}

.stat-card {
    background: var(--bg-mantle);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 20px 24px;
    transition: border-color 0.15s;
}
.stat-card:hover {
    border-color: var(--border-strong);
}

.stat-label {
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fg-subtext0);
    margin-bottom: 12px;
}
.stat-value {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1;
    margin-bottom: 8px;
}
.stat-delta {
    font-size: 12px;
    color: var(--fg-subtext0);
}

.section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    gap: 16px;
}
.section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--fg-text);
    margin: 0;
}

.search {
    background: var(--bg-surface0);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--fg-text);
    padding: 8px 12px;
    font-size: 13px;
    outline: none;
    width: 200px;
    transition: border-color 0.15s;
}
.search::placeholder {
    color: var(--bg-overlay1);
}
.search:focus {
    border-color: var(--accent);
}

.table-wrap {
    background: var(--bg-mantle);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
}

.table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.table thead th {
    padding: 12px 20px;
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fg-subtext0);
    background: var(--bg-crust);
    border-bottom: 1px solid var(--border);
}

.sub-row td {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    color: var(--fg-text);
}
.sub-row:last-child td {
    border-bottom: none;
}
.sub-row:hover td {
    background: var(--bg-surface0);
}

.sub-name {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
}

.muted {
    color: var(--fg-subtext0);
}
.amount {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.status-badge {
    display: inline-block;
    padding: 3px 10px;
    border: 1px solid;
    border-radius: var(--radius-full);
    font-size: 11px;
    font-weight: 600;
    text-transform: capitalize;
    background: color-mix(in srgb, currentColor 10%, transparent);
}

.row-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
}
.sub-row:hover .row-actions {
    opacity: 1;
}

.action-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--bg-surface1);
    color: var(--fg-subtext1);
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s;
}
.action-btn:hover {
    background: var(--bg-surface2);
    color: var(--fg-text);
}
.action-btn.danger:hover {
    background: color-mix(in srgb, var(--red) 15%, transparent);
    color: var(--red);
    border-color: var(--red);
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
</style>
