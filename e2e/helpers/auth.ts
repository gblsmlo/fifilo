/** The owner created by `bun run db:seed`, already a member of the seeded organization. */
export const seedOwner = {
  email: process.env.E2E_OWNER_EMAIL ?? 'owner@fifilo.local',
  id: 'seed_owner',
  name: 'Demo Owner',
  organizationName: 'Fifilo Demo',
  password: process.env.E2E_OWNER_PASSWORD ?? 'change-this-owner-password',
}
