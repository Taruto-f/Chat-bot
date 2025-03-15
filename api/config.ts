export interface Config {
	quiz_status: boolean; // クイズが有効か
	user_scores: Record<string, number>; // ユーザーのスコア
	current_question: number; // 現在の問題番号
	weather_zone: string; // 天気予報の地域
}

export const defaultConfig: Config = {
	quiz_status: false,
	user_scores: {
		dammy: 0,
	},
	current_question: 0,
	weather_zone: "130000", // 東京
};
