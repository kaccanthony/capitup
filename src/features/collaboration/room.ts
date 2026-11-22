export const collaborationFieldName = "caption";

export function collaborationRoomId(
  organizationId: string,
  contentItemId: string,
) {
  return `capitup:${organizationId}:content:${contentItemId}`;
}
