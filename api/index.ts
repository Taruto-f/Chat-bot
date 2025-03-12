// ✅ インポートはファイルの最上部に配置
import {
  type ClientConfig,
  type MessageAPIResponseBase,
  messagingApi,
  middleware,
  type MiddlewareConfig,
  webhook,
  HTTPFetchError,
} from '@line/bot-sdk';
import express, { type Application, type Request, type Response } from 'express';
import admin from 'firebase-admin';

// LINE Bot の設定
const serviceAccount: Record<string, string> = JSON.parse(
    process.env.FIREBASE_ADMIN!
);
const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
};

const middlewareConfig: MiddlewareConfig = {
  channelSecret: process.env.CHANNEL_SECRET || '',

};
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE,
});

const PORT = process.env.PORT || 3000;

// LINE SDK クライアントの作成
const client = new messagingApi.MessagingApiClient(clientConfig);

// ユーザースコアを管理するためのグローバル変数
const userScores: { [key: string]: number } = {};
// クイズの状態を管理するためのグローバル変数
const quizStates: { [key: string]: boolean } = {};
// 現在の問題と答えを管理するためのグローバル変数
const currentQuestions: { [key: string]: { question: string; answer: string } } = {};

// Express アプリの作成
const app: Application = express();

// クイズの問題リストを定数として定義
const QUIZ_QUESTIONS = [
  {
    question: "日本の首都は？",
    answer: "東京"
  },
  {
    question: "1+1は？",
    answer: "2"
  },
  {
    question: "世界で一番大きな大陸は？",
    answer: "ユーラシア"
  },
  {
    question: "太陽系で一番大きな惑星は？",
    answer: "木星"
  },
  {
    question: "日本の国鳥は？",
    answer: "キジ"
  },
  {
    question: "世界で一番長い川は？",
    answer: "ナイル川"
  },
  {
    question: "日本の国花は？",
    answer: "桜"
  },
  {
    question: "世界で一番高い山は？",
    answer: "エベレスト"
  },
  {
    question: "日本の国魚は？",
    answer: "錦鯉"
  },
  {
    question: "世界で一番大きな海は？",
    answer: "太平洋"
  },
  {
    question: "南アフリカにある世界遺産は？",
    answer: "ロック岩"
  },
  {
    question: "世界で一番大きな湖は？",
    answer: "バイカル湖"
  },
  {
    question: "世界で一番大きな火山は？",
    answer: "マウント・エベレスト"
  },
  {
    question: "世界で一番大きな砂漠は？",
    answer: "サハラ砂漠"
  } 
];

// 次の問題を取得する関数
const getNextQuestion = () => {
  return QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)];
};

// ✅ LINE Bot のメッセージ処理
const textEventHandler = async (event: webhook.Event): Promise<MessageAPIResponseBase | undefined> => {
  if (event.type !== 'message' || event.message.type !== 'text') {
      return;
  }

  if (!event.replyToken) return;

  const userMessage = event.message.text.trim(); // ユーザーの入力を取得

  if (userMessage === "判定") {
      const result = Math.random() < 0.5 ? "Yes" : "No";
      await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: result }],
      });
  } else if (userMessage === "数字") {
      await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: String(Math.random()) }],
      });
  } else if (/ありがとう/.test(userMessage)) {
      await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: "どういたしまして" }],
      });
  } else if (/さようなら/.test(userMessage)) {
      await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: "またね" }],
      });
  } else if (/おはようございます/.test(userMessage)) {
      await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: "おはようございます" }],
      });
  } else if (/こんにちは/.test(userMessage)) {
      await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: "こんにちは" }],
      });
  } else if (/こんばんは/.test(userMessage)) {
      await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: "こんばんは" }],
      });
  } else if (userMessage === "占い") {
    const fortunes = [
      "今日はとても良い日になりそうです！",
      "新しいことに挑戦するのに良い日です。",
      "慎重に行動することをお勧めします。",
      "思いがけない幸運が訪れるかもしれません。",
      "周りの人との協力が大切な日です。"
    ];
    const luckyColors = [
      "赤",
      "青",
      "緑",
      "黄",
      "紫",
      "ピンク",
      "オレンジ"
    ];
    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    const luckyColor = luckyColors[Math.floor(Math.random() * luckyColors.length)];
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        { type: 'text', text: `今日の運勢：${fortune}` },
        { type: 'text', text: `ラッキーカラー：${luckyColor}` }
      ],
    });
  }
  //ランダムなアルファベット1文字
  if(userMessage === "アルファベット"){
    const alphabet = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: alphabet }],
    });
  } else if (userMessage === "クイズ") {
    const userId = event.source?.userId || 'anonymous';
    quizStates[userId] = true;
    
    // スコアが未定義の場合は0で初期化
    if (userScores[userId] === undefined) {
      userScores[userId] = 0;
    }

    // 最初の問題を表示
    const firstQuestion = getNextQuestion();
    currentQuestions[userId] = firstQuestion;

    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [
        { type: 'text', text: `現在のスコア: ${userScores[userId]}点` },
        { type: 'text', text: firstQuestion.question },
        { type: 'text', text: "答えを入力してください！" }
      ],
    });
  } else if (userMessage === "クイズ終了") {
    const userId = event.source?.userId || 'anonymous';
    quizStates[userId] = false;
    delete currentQuestions[userId];
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: "クイズを終了しました！" }],
    });
  } else if (userMessage === "次のクイズ") {
    const userId = event.source?.userId || 'anonymous';
    if (quizStates[userId]) {
      const nextQuestion = getNextQuestion();
      currentQuestions[userId] = nextQuestion;
      
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          { type: 'text', text: "次の問題です！" },
          { type: 'text', text: nextQuestion.question },
          { type: 'text', text: "答えを入力してください！" }
        ],
      });
    } else {
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: "クイズを開始するには「クイズ」と入力してください。" }],
      });
    }
  } else if (userMessage.startsWith("ANSWER:")) {
    // これは内部処理用のメッセージなので無視
    return;
  } else if (userMessage === "スコア") {
    const userId = event.source?.userId || 'anonymous';
    // スコアが未定義の場合は0で初期化
    if (userScores[userId] === undefined) {
      userScores[userId] = 0;
    }
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: `あなたの現在のスコアは ${userScores[userId]} 点です！` }],
    });
  } else if (userMessage === "リセット") {
    const userId = event.source?.userId || 'anonymous';
    userScores[userId] = 0;
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: "スコアをリセットしました！" }],
    });
  } else {
    const userId = event.source?.userId || 'anonymous';
    
    // クイズがアクティブな場合のみ答えをチェック
    if (quizStates[userId] && currentQuestions[userId]) {
      const currentQuestion = currentQuestions[userId];
      const userAnswer = userMessage.trim();
      
      if (userAnswer === currentQuestion.answer) {
        userScores[userId] = (userScores[userId] || 0) + 10;
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            { type: 'text', text: "正解です！" },
            { type: 'text', text: `+10点！ 現在のスコア: ${userScores[userId]}点` }
          ],
        });
      } else {
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            { type: 'text', text: "残念ながら不正解です。" },
            { type: 'text', text: `正解は「${currentQuestion.answer}」でした。` },
            { type: 'text', text: `現在のスコア: ${userScores[userId]}点` }
          ],
        });
      }

      // 次の問題を表示（正解・不正解どちらの場合も）
      const nextQuestion = getNextQuestion();
      currentQuestions[userId] = nextQuestion;
      
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [
          { type: 'text', text: "次の問題です！" },
          { type: 'text', text: nextQuestion.question },
          { type: 'text', text: "答えを入力してください！" }
        ],
      });
    }
  }
};

// ✅ Webhookのエンドポイント
app.post(
  '/webhook',
  middleware(middlewareConfig),
  (async (req: Request, res: Response): Promise<Response> => {
      const callbackRequest: webhook.CallbackRequest = req.body;
      const events: webhook.Event[] = callbackRequest.events!;

      const results = await Promise.all(
          events.map(async (event: webhook.Event) => {
              try {
                  await textEventHandler(event);
              } catch (err: unknown) {
                  if (err instanceof HTTPFetchError) {
                      console.error(err.status);
                      console.error(err.headers.get('x-line-request-id'));
                      console.error(err.body);
                  } else if (err instanceof Error) {
                      console.error(err);
                  }

                  return res.status(500).json({ status: 'error' });
              }
          })
      );

      return res.status(200).json({ status: 'success', results });
  }) as any
);

// ✅ サーバー起動
app.listen(PORT, () => {
  console.log(`Application is live and listening on port ${PORT}`);
});