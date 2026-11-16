<template>
  <NuiLayout
    v-model:open="open"
    content-as="div"
    header="full"
    sticky
    :shortcut="false"
    :skip-link="false"
    class="min-h-dvh"
  >
    <template #sidebar>
      <NuiSidebar collapsible="icon" label="Back office sections">
        <NuiSidebarContent>
          <NuiSidebarGroup>
            <NuiSidebarItem
              v-for="section in sections"
              :key="section.key"
              :label="section.label"
              :icon="section.icon"
              :badge="section.rows.length"
              :tooltip="section.label"
              :current="active === section.key"
              @click="active = section.key"
            />
          </NuiSidebarGroup>
        </NuiSidebarContent>
        <NuiSidebarFooter>
          <NuiSidebarGroup>
            <NuiSidebarItem label="Settings" :icon="Settings" tooltip="Settings" />
          </NuiSidebarGroup>
        </NuiSidebarFooter>
      </NuiSidebar>
    </template>
    <template #header>
      <NuiAppBar>
        <template #start>
          <NuiSidebarTrigger />
        </template>
        <div class="flex items-center gap-2">
          <span
            class="flex size-7 flex-none items-center justify-center rounded-md bg-primary text-primary-foreground"
          >
            <NuiIcon :icon="Store" />
          </span>
          <span class="truncate text-sm max-sm:hidden">Store back office</span>
        </div>
        <div class="w-full sm:ms-auto sm:w-64">
          <NuiInput
            v-model="query"
            type="search"
            size="sm"
            placeholder="Search this section"
            aria-label="Search this section"
          >
            <template #prefix><NuiIcon icon="search" /></template>
          </NuiInput>
        </div>
        <template #end>
          <NuiMenu placement="bottom-end">
            <template #trigger="{ attrs }">
              <NuiButton
                v-bind="attrs"
                variant="ghost"
                tone="neutral"
                :size="phone ? 'sm' : undefined"
                :icon-only="phone"
                :round="phone"
                :aria-label="manager.name"
              >
                <NuiAvatar :name="manager.name" size="sm" />
                <span v-if="!phone" class="hidden sm:inline">{{ manager.name }}</span>
              </NuiButton>
            </template>
            <NuiMenuLabel>{{ manager.role }}</NuiMenuLabel>
            <NuiMenuItem icon="user" @select="toast.info(manager.email)">Profile</NuiMenuItem>
            <NuiMenuSeparator />
            <NuiMenuItem :icon="LogOut" @select="toast.info('You are signed out')">
              Sign out
            </NuiMenuItem>
          </NuiMenu>
        </template>
      </NuiAppBar>
    </template>
    <div class="flex flex-col gap-4 px-layout-gutter py-6">
      <div class="flex flex-col gap-1">
        <h1 class="m-0 text-xl font-semibold tracking-tight">{{ current.label }}</h1>
        <p class="m-0 text-sm text-muted-foreground">{{ current.summary }}</p>
      </div>
      <NuiList variant="outline" :label="current.label" empty-label="Nothing found">
        <NuiListItem
          v-for="row in found"
          :key="row.key"
          :label="row.label"
          :description="row.description"
        >
          <template #trailing>{{ row.note }}</template>
        </NuiListItem>
      </NuiList>
    </div>
  </NuiLayout>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue';
import { LogOut, Package, Settings, ShoppingCart, Store, UserCog, Users } from '@lucide/vue';
import { useMediaQuery, useToast } from '@numior/primitives';
import {
  NuiAppBar,
  NuiAvatar,
  NuiButton,
  NuiIcon,
  NuiInput,
  NuiLayout,
  NuiList,
  NuiListItem,
  NuiMenu,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuSeparator,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarFooter,
  NuiSidebarGroup,
  NuiSidebarItem,
  NuiSidebarTrigger,
} from '@numior/vue';
import { customers } from '#demo/customers';
import { ORDER_STATUSES, orders } from '#demo/orders';
import { products } from '#demo/products';
import { team } from '#demo/team';

interface Row {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly note: string;
}

interface Section {
  readonly key: string;
  readonly label: string;
  readonly summary: string;
  readonly icon: Component;
  readonly rows: readonly Row[];
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const sections: readonly Section[] = [
  {
    key: 'orders',
    label: 'Orders',
    summary: 'Orders from the last two weeks',
    icon: ShoppingCart,
    rows: orders.map((order) => ({
      key: String(order.id),
      label: `#${order.id} · ${order.customer}`,
      description: `${order.city} · ${ORDER_STATUSES[order.status]}`,
      note: money.format(order.total),
    })),
  },
  {
    key: 'products',
    label: 'Products',
    summary: 'The catalog and what is in stock',
    icon: Package,
    rows: products.map((product) => ({
      key: product.sku,
      label: product.name,
      description: `${product.sku} · ${product.stock} in stock`,
      note: money.format(product.price),
    })),
  },
  {
    key: 'customers',
    label: 'Customers',
    summary: 'Everyone who has placed an order',
    icon: Users,
    rows: customers.map((customer) => ({
      key: String(customer.id),
      label: customer.name,
      description: `${customer.city} · ${customer.orders} orders`,
      note: money.format(customer.spent),
    })),
  },
  {
    key: 'team',
    label: 'Team',
    summary: 'People with access to the back office',
    icon: UserCog,
    rows: team.map((person) => ({
      key: person.id,
      label: person.name,
      description: person.email,
      note: person.role,
    })),
  },
];

const fallback: Section = { key: '', label: '', summary: '', icon: Settings, rows: [] };
const [manager] = team;
const toast = useToast();
const phone = useMediaQuery('(max-width: 39.99rem)');

const open = ref(true);
const active = ref('orders');
const query = ref('');

const current = computed(() => sections.find((entry) => entry.key === active.value) ?? fallback);

const found = computed(() => {
  const needle = query.value.trim().toLowerCase();

  return current.value.rows.filter((row) =>
    `${row.label} ${row.description}`.toLowerCase().includes(needle),
  );
});
</script>
