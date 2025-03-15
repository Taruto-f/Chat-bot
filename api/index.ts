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
		question: "古代メソポタミア文明で最初に作られた文字は何ですか？",
		answer: "楔形文字",
	},
	{
		question: "古代エジプト文明のナイル川流域で栽培された主な作物は何ですか？",
		answer: "小麦",
	},
	{
		question: "インダス文明の代表的な都市遺跡の1つは何ですか？",
		answer: "モヘンジョダロ",
	},
	{
		question: "中国の黄河文明で生まれた最古の王朝は何ですか？",
		answer: "殷",
	},
	{
		question: "日本の気候は何気候に属していますか？",
		answer: "温帯",
	},
	{
		question: "世界の三大宗教とは、キリスト教、イスラム教、そしてもう1つは何ですか？",
		answer: "仏教",
	},
	{
		question: "アフリカ大陸を南北に走る大地溝帯の名前は何ですか？",
		answer: "グレートリフトバレー",
	},
	{
		question: "縄文時代の主な生活様式は何ですか？",
		answer: "狩猟採集",
	},
	{
		question: "弥生時代に伝来した最も重要な技術は何ですか？",
		answer: "稲作",
	},
	{
		question: "古墳時代の代表的な前方後円墳である仁徳天皇陵古墳がある都道府県はどこですか？",
		answer: "大阪府",
	},
	{
		question: "飛鳥時代に制定された日本最古の成文法典は何ですか？",
		answer: "大宝律令",
	},
	{
		question: "奈良時代に編纂された日本最古の歴史書は何ですか？",
		answer: "古事記",
	},
	{
		question: "世界の三大穀物は、米、小麦、そしてもう1つは何ですか？",
		answer: "とうもろこし",
	},
	{
		question: "日本の四大工業地帯の1つで、京浜工業地帯がある関東地方の2つの都県は何ですか？",
		answer: "東京都と神奈川県",
	},
	{
		question: "世界最大の熱帯雨林はどこにありますか？",
		answer: "アマゾン",
	},
	{
		question: "モンスーンの影響を強く受ける地域として知られるアジアの半島は何ですか？",
		answer: "インド半島",
	},
	{
		question: "日本の人口が最も集中している三大都市圏の中心となる都市を答えてください。",
		answer: "東京",
	},
	{
		question: "聖徳太子が制定した日本最古の憲法は何ですか？",
		answer: "十七条憲法",
	},
	{
		question: "平安時代に編纂された最初の仮名文学は何ですか？",
		answer: "土佐日記",
	},
	{
		question: "世界で最も標高の高い大陸は何ですか？",
		answer: "南極大陸",
	},
	{
		question: "古代ギリシャの都市国家を何と呼びましたか？",
		answer: "ポリス",
	},
	{
		question: "古代ローマ帝国の最盛期の皇帝は誰ですか？",
		answer: "トラヤヌス",
	},
	{
		question: "シルクロードの東の起点となった中国の都は何ですか？",
		answer: "長安",
	},
	{
		question: "奈良時代に建立された大仏がある寺院は何ですか？",
		answer: "東大寺",
	},
	{
		question: "平安時代に完成した、日本で最古の漢字辞典は何ですか？",
		answer: "新撰字鏡",
	},
	{
		question: "世界最大の砂漠はどこにありますか？",
		answer: "サハラ砂漠",
	},
	{
		question: "日本で最も古い神社とされるのは何ですか？",
		answer: "大神神社",
	},
	{
		question: "世界三大河川の1つで、エジプト文明を育んだ川は何ですか？",
		answer: "ナイル川",
	},
	{
		question: "縄文時代を代表する土器の模様は何ですか？",
		answer: "縄目模様",
	},
	{
		question: "古代中国の四大発明の1つで、紙の発明者とされる人物は誰ですか？",
		answer: "蔡倫",
	},
	{
		question: "日本の気候を特徴づける梅雨は何によってもたらされますか？",
		answer: "梅雨前線",
	},
	{
		question: "世界最大のサンゴ礁は何ですか？",
		answer: "グレートバリアリーフ",
	},
	{
		question: "飛鳥時代に建立された法隆寺は何県にありますか？",
		answer: "奈良県",
	},
	{
		question: "古代エジプトのピラミッドが最も多く建設された王朝は何ですか？",
		answer: "古王国時代",
	},
	{
		question: "日本の地形を形作る4つのプレートの1つ、太平洋プレートが接する海溝は何ですか？",
		answer: "日本海溝",
	},
	{
		question: "古代ローマで作られた円形闘技場の代表的な建造物は何ですか？",
		answer: "コロッセウム",
	},
	{
		question: "奈良時代に編纂された日本最古の地理書は何ですか？",
		answer: "風土記",
	},
	{
		question: "世界で最も人口密度が高い大陸はどこですか？",
		answer: "アジア",
	},
	{
		question: "日本の水田農業が本格的に始まったのは何時代からですか？",
		answer: "弥生時代",
	},
	{
		question: "世界遺産に登録されている富士山の標高は何メートルですか？",
		answer: "3776",
	}
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
	} else if (/おはよう/.test(userMessage)) {
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: "おはよう" }],
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
	} else if (userMessage === "漢字") {
		// ランダムな漢字をいう
		const kanji = String.fromCharCode(
			0x4e00 + Math.floor(Math.random() * (0x9faf - 0x4e00 + 1)),
		);
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{ type: "textV2", text: kanji }],
		});
	} else if (userMessage === "機能") {
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{
				type: "text",
				text: "以下のボタンから機能を選択してください。",
				quickReply: {
					items: [
						{
							type: "action",
							action: {
								type: "message",
								label: "天気予報",
								text: "天気"
							}
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "クイズ",
								text: "クイズ"
							}
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "占い",
								text: "占い"
							}
						}
					]
				}
			}]
		});
	} else if (userMessage === "挨拶" || userMessage === "あいさつ") {
		await client.replyMessage({
			replyToken: event.replyToken,
			messages: [{
				type: "text",
				text: "以下のボタンから挨拶を選択してください。",
				quickReply: {
					items: [
						{
							type: "action",
							action: {
								type: "message",
								label: "ありがとう",
								text: "ありがとう"
							}
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "さようなら",
								text: "さようなら"
							}
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "おはよう",
								text: "おはよう"
							}
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "こんにちは",
								text: "こんにちは"
							}
						},
						{
							type: "action",
							action: {
								type: "message",
								label: "こんばんは",
								text: "こんばんは"
							}
						}
					]
				}
			}]
		});
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
		} else {
			// クイズがアクティブでない場合は、クイックリプライを表示
			await client.replyMessage({
				replyToken: event.replyToken,
				messages: [{
					type: "text",
					text: "以下のボタンから機能を選択してください。",
					quickReply: {
						items: [
							{
								type: "action",
								action: {
									type: "message",
									label: "天気予報",
									text: "天気"
								}
							},
							{
								type: "action",
								action: {
									type: "message",
									label: "クイズ",
									text: "クイズ"
								}
							},
							{
								type: "action",
								action: {
									type: "message",
									label: "占い",
									text: "占い"
								}
							}
						]
					}
				}]
			});
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
