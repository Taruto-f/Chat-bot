export interface Config {
	quiz_status: boolean; // クイズが有効か
	user_scores: Record<string, number>; // ユーザーのスコア
	current_question: number; // 現在の問題番号
	weather_zone: string; // 天気予報の地域
	todo_list: string[]; // やることリスト
	reminder_enabled: boolean; // リマインダーが有効か
	last_reminder: number; // 最後にリマインダーを送った時間
	is_silent: boolean; // 通知をしないか
}

export const defaultConfig: Config = {
	quiz_status: false,
	user_scores: {
		dammy: 0,
	},
	current_question: 0,
	weather_zone: "130000", // 東京
	todo_list: [], // やることリスト
	reminder_enabled: false, // リマインダーはデフォルトで無効
	last_reminder: 0, // 最後にリマインダーを送った時間
	is_silent: false, // 通知をしないか
};
