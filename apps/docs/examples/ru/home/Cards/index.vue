<template>
  <div class="@container">
    <div
      class="grid grid-cols-1 items-start gap-6 @3xl:grid-cols-2 @5xl:grid-cols-3 @min-[100rem]:grid-cols-4"
    >
      <div class="flex flex-col gap-6">
        <Elements />
        <Description />
        <Estimate />
        <OrdersByStatus />
      </div>
      <div class="hidden flex-col gap-6 @3xl:flex">
        <Revenue />
        <RecentOrders />
        <Catalog />
        <Notifications />
      </div>
      <div class="hidden flex-col gap-6 @5xl:flex">
        <NewOrder />
        <DeliveryDate />
        <OrderStatus />
      </div>
      <div class="hidden flex-col gap-6 @min-[100rem]:flex">
        <Team />
        <SignInCode />
        <Photos />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Catalog from './Catalog.vue';
import DeliveryDate from './DeliveryDate.vue';
import Description from './Description.vue';
import Elements from './Elements.vue';
import Estimate from './Estimate.vue';
import NewOrder from './NewOrder.vue';
import Notifications from './Notifications.vue';
import OrdersByStatus from './OrdersByStatus.vue';
import OrderStatus from './OrderStatus.vue';
import Photos from './Photos.vue';
import RecentOrders from './RecentOrders.vue';
import Revenue from './Revenue.vue';
import SignInCode from './SignInCode.vue';
import Team from './Team.vue';
</script>
