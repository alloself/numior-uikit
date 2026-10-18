<template>
  <form>
    <FieldValueInput :form="form" :select="email" />
    <FieldValueInput :form="form" :select="city" />
  </form>
</template>

<script setup lang="ts">
import { useForm } from '../../src';
import FieldValueInput from './FieldValueInput.vue';

interface ProfileValues {
  email: string;
  address: { city: string };
}

const form = useForm<ProfileValues>({
  initialValues: { email: 'ann@example.com', address: { city: 'Paris' } },
  onSubmit: () => undefined,
});

const email = (values: ProfileValues) => values.email;

const city = (values: ProfileValues) => values.address.city;
</script>
