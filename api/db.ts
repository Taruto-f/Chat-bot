// import type { Database, Reference } from "firebase-admin/database";

import type { Reference } from "firebase-admin/database";

export async function get<T>(ref: Reference): Promise<T> {
	const snapshot = (await ref.once("value")).toJSON();
	return snapshot as T;
}
