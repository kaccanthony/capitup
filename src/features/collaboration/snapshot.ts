import "server-only";

import { createHash } from "node:crypto";
import * as Y from "yjs";
import { yDocToProsemirrorJSON } from "y-prosemirror";
import {
  collaborationEditorNodeSchema,
  type CollaborationEditorNode,
} from "@/features/collaboration/contracts";
import { collaborationFieldName } from "@/features/collaboration/room";

function nodePlainText(node: CollaborationEditorNode): string {
  if (typeof node.text === "string") {
    return node.text;
  }

  const children = (node.content ?? []).map(nodePlainText);
  const separator = node.type === "doc" ? "\n" : "";
  return children.join(separator);
}

export function decodeCollaborationSnapshot(binaryUpdate: ArrayBuffer) {
  const document = new Y.Doc();
  Y.applyUpdate(document, new Uint8Array(binaryUpdate));

  const parsed = collaborationEditorNodeSchema.safeParse(
    yDocToProsemirrorJSON(document, collaborationFieldName),
  );
  if (!parsed.success) {
    throw new Error("The collaborative document could not be serialized.");
  }

  const editorJson = parsed.data;
  const plainText = nodePlainText(editorJson).trim();
  const normalizedText = plainText.normalize("NFC").toLocaleLowerCase().trim();
  const snapshotHash = createHash("sha256")
    .update(JSON.stringify(editorJson))
    .digest("hex");

  return { editorJson, plainText, normalizedText, snapshotHash };
}
