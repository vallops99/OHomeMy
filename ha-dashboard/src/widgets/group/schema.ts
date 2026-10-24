/**
 * A Group (CONTEXT.md, #52): an ordered set of entities, of any Domains a
 * Group can show mixed freely (ADR-0017), under one title, in one card, each
 * member in its own Domain's shape. The Group itself controls nothing as a
 * whole: a Group of locks would otherwise open every gate at once. It holds
 * entities, not a `group` helper, so there are no Group-wide controls to
 * hide.
 *
 * - `full`: each member in its full form.
 * - `compact`: each member in its compact form, where its Domain has one.
 *
 * Each Member (CONTEXT.md, #73) may have its own name, Variant and tap
 * (`Member`); unset, it shows Home Assistant's name in the Group's Variant
 * and opens nothing. Members Home Assistant no longer has are dropped; with
 * none left the Widget is skipped. An Unavailable member is the Fault tile, in its place.
 * It has no Default title: only what someone writes (`./title`).
 */
import { defineSchema } from '../../document/schema';
import { GROUP_DOMAINS, VARIANT_DOMAINS } from '../shared/domains';

export const groupSchema = defineSchema({
  kind: 'group',
  variants: ['full', 'compact'],
  titled: 'own',
  settings: {
    // The Group draws a vacuum in the Vacuum's shape, so its error counts too (#80).
    members: { type: 'members', domains: GROUP_DOMAINS, variantDomains: VARIANT_DOMAINS, malfunction: { vacuum: ['error'] } },
  },
});
