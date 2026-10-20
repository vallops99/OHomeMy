/**
 * What a Group's Member shows (#73): its own name where one is written, in
 * place of Home Assistant's, in its row and its Fault tile alike; and its
 * own Variant where one is set, whatever the Group's, else the Group's.
 * The Concern list keeps Home Assistant's name: it lists the house, not
 * this Group.
 *
 * No React, so `members.test.ts` runs it under plain Node.
 */
import type { Member, Variant } from '../../document/schema';
import type { Entity } from '../../ha';

export function memberShown(member: Member, entity: Entity, groupVariant: Variant): { entity: Entity; variant: Variant } {
  return { entity: member.name === null ? entity : { ...entity, name: member.name }, variant: member.variant ?? groupVariant };
}
