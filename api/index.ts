// ✅ インポートはファイルの最上部に配置
import {
	type ClientConfig,
	type MessageAPIResponseBase,
	messagingApi,
	middleware,
	type MiddlewareConfig,
	type webhook,
	HTTPFetchError,
} from "@line/bot-sdk";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import admin from "firebase-admin";
import { getDatabase, type Reference } from "firebase-admin/database";
import { defaultConfig, type Config } from "./config";
import { get } from "./db";
import { getWeatherForecast } from "./weather";

// LINE Bot の設定
const serviceAccount: Record<string, string> = JSON.parse(
	process.env.FIREBASE_ADMIN ?? "{}",
);
const clientConfig: ClientConfig = {
	channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN ?? "",
};

const middlewareConfig: MiddlewareConfig = {
	channelSecret: process.env.CHANNEL_SECRET ?? "",
};
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: process.env.FIREBASE_DATABASE,
});

const PORT = process.env.PORT ?? 3000;

// LINE SDK クライアントの作成
const client = new messagingApi.MessagingApiClient(clientConfig);

const db = getDatabase();

// Express アプリの作成
const app: Application = express();

// クイズの問題リストを定数として定義
const QUIZ_QUESTIONS = [
	{
		question: "日本の首都は？",
		answer: "東京",
	},
	{
		question: "1+1は？",
		answer: "2",
	},
	{
		question: "世界で一番大きな大陸は？",
		answer: "ユーラシア",
	},
	{
		question: "太陽系で一番大きな惑星は？",
		answer: "木星",
	},
	{
		question: "日本の国鳥は？",
		answer: "キジ",
	},
	{
		question: "世界で一番長い川は？",
		answer: "ナイル川",
	},
	{
		question: "日本の国花は？",
		answer: "桜",
	},
	{
		question: "世界で一番高い山は？",
		answer: "エベレスト",
	},
	{
		question: "日本の国魚は？",
		answer: "錦鯉",
	},
	{
		question: "世界で一番大きな海は？",
		answer: "太平洋",
	},
	{
		question: "南アフリカにある世界遺産は？",
		answer: "ロック岩",
	},
	{
		question: "世界で一番大きな湖は？",
		answer: "バイカル湖",
	},
	{
		question: "世界で一番大きな火山は？",
		answer: "マウント・エベレスト",
	},
	{
		question: "世界で一番大きな砂漠は？",
		answer: "サハラ砂漠",
	},
	{
		question: "日本の国歌は？",
		answer: "君が代",
	},
	{
		question: "世界で一番大きな国は？",
		answer: "ロシア",
	},
	{
		question: "日本の国技は？",
		answer: "相撲",
	},
	{
		question: "世界で一番人口の多い国は？",
		answer: "中国",
	},
	{
		question: "日本の国石は？",
		answer: "翡翠",
	},
	{
		question: "世界で一番大きな島は？",
		answer: "グリーンランド",
	},
];

// 次の問題を取得する関数
const getNextQuestion = () => {
	return Math.floor(Math.random() * QUIZ_QUESTIONS.length);
};

// ✅ LINE Bot のメッセージ処理
const textEventHandler = async (
	event: webhook.Event,
	ref: Reference,
): Promise<MessageAPIResponseBase | undefined> => {
	if (event.type !== "message" || event.message.type !== "text") {
		return;
	}

	if (!event.replyToken) return;

	const userMessage = event.message.text.trim(); // ユーザーの入力を取得

	// db
	let config: Config = await get(ref);

	async function update(db: Reference, new_config: Partial<Config>) {
		await db.update(new_config);
		config = await get(ref);
	}

	const splitMessage = userMessage
		.split(/\s|　/)
		.filter((val) => val.length > 0);

	const quizScoreRef = ref.child("user_scores");

	if (userMessage === "判定") {
		const result = Math.random() < 0.5 ? "Yes" : "No";
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: result }],
		});
	} else if (userMessage === "数字") {
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: String(Math.random()) }],
		});
	} else if (/ありがとう/.test(userMessage)) {
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: "どういたしまして" }],
		});
	} else if (/さようなら/.test(userMessage)) {
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: "またね" }],
		});
	} else if (/おはようございます/.test(userMessage)) {
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: "おはようございます" }],
		});
	} else if (/こんにちは/.test(userMessage)) {
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: "こんにちは" }],
		});
	} else if (/こんばんは/.test(userMessage)) {
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: "こんばんは" }],
		});
	} else if (userMessage === "占い") {
		const fortunes = [
			"今日はとても良い日になりそうです！",
			"新しいことに挑戦するのに良い日です。",
			"慎重に行動することをお勧めします。",
			"思いがけない幸運が訪れるかもしれません。",
			"周りの人との協力が大切な日です。",
		];
		const luckyColors = ["赤", "青", "緑", "黄", "紫", "ピンク", "オレンジ"];
		const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
		const luckyColor =
			luckyColors[Math.floor(Math.random() * luckyColors.length)];
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [
				{ type: "textV2", text: `今日の運勢：${fortune}` },
				{ type: "textV2", text: `ラッキーカラー：${luckyColor}` },
			],
		});
	}
	//ランダムなアルファベット1文字
	if (userMessage === "アルファベット") {
		const alphabet = String.fromCharCode(65 + Math.floor(Math.random() * 26));
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: alphabet }],
		});
	} else if (userMessage === "クイズ") {
		const userId = event.source?.userId || "anonymous";
		await update(ref, { quiz_status: true });

		// スコアが未定義の場合は0で初期化
		if (config.user_scores[userId] === undefined) {
			await update(quizScoreRef, {
				[userId]: 0,
			});
		}

		// 最初の問題を表示
		const firstQuestionId = getNextQuestion();
		await update(ref, {
			current_question: firstQuestionId,
		});
		const firstQuestion = QUIZ_QUESTIONS[firstQuestionId];

		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [
				{
					type: "textV2",
					text: `現在のスコア: ${config.user_scores[userId]}点`,
				},
				{ type: "textV2", text: firstQuestion.question },
				{ type: "textV2", text: "答えを入力してください！" },
			],
		});
	} else if (userMessage === "クイズ終了") {
		const userId = event.source?.userId ?? "anonymous";
		await update(ref, { quiz_status: false });
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: "クイズを終了しました！" }],
		});
	} else if (userMessage === "次のクイズ") {
		if (config.quiz_status) {
			const nextQuestionId = getNextQuestion();
			await update(ref, { current_question: nextQuestionId });
			const nextQuestion = QUIZ_QUESTIONS[nextQuestionId];

			await client.replyMessage({
				replyToken: event.replyToken,
				messages: [
					{ type: "textV2", text: "次の問題です！" },
					{ type: "textV2", text: `Q. ${nextQuestion.question}` },
					{ type: "textV2", text: "答えを入力してください！" },
				],
			});
		} else {
			await client.replyMessage({
				replyToken: event.replyToken,
				messages: [
					{
						type: "textV2",
						text: "クイズを開始するには「クイズ」と入力してください。",
					},
				],
			});
		}
	} else if (userMessage.startsWith("ANSWER:")) {
		// これは内部処理用のメッセージなので無視
		return;
	} else if (userMessage === "スコア") {
		const userId = event.source?.userId || "anonymous";
		// スコアが未定義の場合は0で初期化
		if (config.user_scores[userId] === undefined) {
			await update(quizScoreRef, {
				[userId]: 0,
			});
		}
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [
				{
					type: "textV2",
					text: `あなたの現在のスコアは ${config.user_scores[userId]} 点です！`,
				},
			],
		});
	} else if (userMessage === "リセット") {
		const userId = event.source?.userId ?? "anonymous";
		await update(quizScoreRef, {
			[userId]: 0,
		});
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: "スコアをリセットしました！" }],
		});
	} else if (userMessage === "!!db") {
		// デバッグ用　データベース出力
		const json = JSON.stringify(await get(ref));
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "text", text: json }],
		});
	} else if (userMessage === "天気") {
		try {
			const forecast = await getWeatherForecast(config.weather_zone);
			await client.replyMessage({
				replyToken: event.replyToken,
				messages: [
					{ type: "textV2", text: `【${forecast.targetArea}の天気予報】` },
					{ type: "textV2", text: forecast.text },
					{
						type: "textV2",
						text: `発表時刻: ${new Date(forecast.reportDatetime).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}(日本時間)\n発表者: ${forecast.publishingOffice}`,
					},
				],
			});
		} catch (error) {
			await client.replyMessage({
				replyToken: event.replyToken,
				messages: [
					{
						type: "textV2",
						text: "申し訳ありません。天気予報の取得に失敗しました。\n天気ゾーンなどの設定をご確認ください。",
					},
				],
			});
		}
	} else if (splitMessage[0] === "天気ゾーン") {
		if (splitMessage.length === 1) {
			await client.replyMessage({
				replyToken: event.replyToken,
				messages: [
					{
						type: "textV2",
						text: "「天気ゾーン (ゾーン番号)」と入力することで天気ゾーンを設定できます。\n天気ゾーン一覧はこちら: https://x.gd/lhdUU",
					},
					{
						type: "textV2",
						text: `現在の天気ゾーン: ${config.weather_zone}`,
					},
				],
			});
		} else {
			const zone = splitMessage[1];
			if (/\d{6}/.test(zone)) {
				try {
					const weather = await getWeatherForecast(zone);

					await update(ref, { weather_zone: zone });
					await client.replyMessage({
						replyToken: event.replyToken,
						messages: [
							{
								type: "textV2",
								text: `天気ゾーンを${zone}に設定しました。`,
							},
							{
								type: "textV2",
								text: `地域: ${weather.targetArea}\n発表者: ${weather.publishingOffice}`,
							},
						],
					});
				} catch (error) {
					await client.replyMessage({
						replyToken: event.replyToken,
						messages: [
							{
								type: "textV2",
								text: "天気ゾーンが正しく入力されていません。\n「天気ゾーン (ゾーン番号)」と入力してください。\nゾーン番号は6桁の半角数字です。",
							},
						],
					});
				}
			} else {
				await client.replyMessage({
					replyToken: event.replyToken,
					messages: [
						{
							type: "textV2",
							text: "天気ゾーンが正しく入力されていません。\n「天気ゾーン (ゾーン番号)」と入力してください。\nゾーン番号は6桁の半角数字です。",
						},
					],
				});
			}
		}
	} else {
		const userId = event.source?.userId ?? "anonymous";

		// クイズがアクティブな場合のみ答えをチェック!
		if (config.quiz_status) {
			const currentQuestion = QUIZ_QUESTIONS[config.current_question];
			const userAnswer = userMessage.trim();
			const nextQuestionId = getNextQuestion();
			await update(ref, { current_question: nextQuestionId });
			const nextQuestion = QUIZ_QUESTIONS[nextQuestionId];
			const nextQuestionMessage: { type: "textV2"; text: string }[] = [
				{ type: "textV2", text: "次の問題です！" },
				{ type: "textV2", text: `Q. ${nextQuestion.question}` },
				{ type: "textV2", text: "答えを入力してください！" },
			];
			// スコアが未定義の場合は0で初期化
			if (config.user_scores[userId] === undefined) {
				await update(quizScoreRef, {
					[userId]: 0,
				});
			}

			if (userAnswer === currentQuestion.answer) {
				await update(quizScoreRef, {
					[userId]: (config.user_scores[userId] ?? 0) + 10,
				});
				await client.replyMessage({
					replyToken: event.replyToken,
					messages: [
						{ type: "textV2", text: "正解です！" },
						{
							type: "textV2",
							text: `+10点！ 現在のスコア: ${config.user_scores[userId]}点`,
						},
						...nextQuestionMessage,
					],
				});
			} else {
				await client.replyMessage({
					replyToken: event.replyToken,
					messages: [
						{
							type: "textV2",
							text: `残念ながら不正解です。\n正解は「${currentQuestion.answer}」でした。`,
						},
						{
							type: "textV2",
							text: `現在のスコア: ${config.user_scores[userId]}点`,
						},
						...nextQuestionMessage,
					],
				});
			}
		}
	}
};

// ✅ Webhookのエンドポイント
app.post(
	"/webhook",
	middleware(middlewareConfig),
	async (req: Request, res: Response): Promise<void> => {
		const callbackRequest: webhook.CallbackRequest = req.body;
		const events: webhook.Event[] = callbackRequest.events || [];
		const ref = db.ref("data");

		const results = await Promise.all(
			events.map(async (event: webhook.Event) => {
				try {
					const child = (() => {
						if (event.source?.type === "group") {
							return ref.child(`group/${event.source.groupId}`);
						}
						if (event.source?.type === "room") {
							return ref.child(`room/${event.source.roomId}`);
						}
						if (event.source?.type === "user") {
							return ref.child(`user/${event.source.userId}`);
						}
					})();

					if (child === undefined) {
						throw new Error("child is undefined");
					}

					const config: Config = await get(child);
					await child.set(Object.assign({}, defaultConfig, config));

					await textEventHandler(event, child);
				} catch (err: unknown) {
					if (err instanceof HTTPFetchError) {
						console.error(err.status);
						console.error(err.headers.get("x-line-request-id"));
						console.error(err.body);
					} else if (err instanceof Error) {
						console.error(err);
					}

					return res.status(500).json({ status: "error" });
				}
			}),
		);

		res.status(200).json({ status: "success", results });
	},
);

// ✅ サーバー起動
app.listen(PORT, () => {
	console.log(`Application is live and listening on port ${PORT}`);
});
