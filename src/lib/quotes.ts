/**
 * 今日一句。
 *
 * 需求是「每天不同，随机出现」，但不能真的随机 —— 真随机意味着：
 * 同一天刷新两次会看到不同的句子，两台设备看到的也不一样，
 * 那就从「今天的一句话」变成了「每次刷新的抽奖」。
 *
 * 所以做法是"按天推进的伪随机"：以一个固定的步长在句库里往前走。
 * 因为步长和总数互质，走满一轮刚好把所有句子都用一遍，期间不会重复；
 * 同一天里，所有人、所有设备、刷新多少次，看到的都是同一句。
 */

export interface Quote {
  text: string;
  /** 有出处的才写；现代短句不硬凑作者 */
  from?: string;
}

export const QUOTES: Quote[] = [
  /* ---------------------------- 古人说过的话 ---------------------------- */
  { text: "行到水穷处，坐看云起时。", from: "王维《终南别业》" },
  { text: "莫听穿林打叶声，何妨吟啸且徐行。", from: "苏轼《定风波》" },
  { text: "回首向来萧瑟处，归去，也无风雨也无晴。", from: "苏轼《定风波》" },
  { text: "此心安处是吾乡。", from: "苏轼《定风波》" },
  { text: "知止而后有定，定而后能静。", from: "《礼记 · 大学》" },
  { text: "千里之行，始于足下。", from: "《道德经》" },
  { text: "天下难事，必作于易；天下大事，必作于细。", from: "《韩非子 · 喻老》" },
  { text: "岁寒，然后知松柏之后凋也。", from: "《论语 · 子罕》" },
  { text: "山重水复疑无路，柳暗花明又一村。", from: "陆游《游山西村》" },
  { text: "欲速则不达，见小利则大事不成。", from: "《论语 · 子路》" },
  { text: "不积跬步，无以至千里。", from: "《荀子 · 劝学》" },
  { text: "采菊东篱下，悠然见南山。", from: "陶渊明《饮酒》" },
  { text: "岁月不居，时节如流。", from: "孔融《论盛孝章书》" },
  { text: "物来顺应，未来不迎，当时不杂，既过不恋。", from: "曾国藩" },

  /* ------------------------------ 自己的人生 ------------------------------ */
  { text: "祝你拥有随时停留和休息的底气。" },
  { text: "慢一点没关系，只要方向是自己的。" },
  { text: "长期主义不是熬时间，是把时间花在会长大的地方。" },
  { text: "记录不是为了证明什么，是为了看见自己真的走过。" },
  { text: "你不需要每天都很好，只需要知道自己在做什么。" },
  { text: "有些进展看上去像停滞，其实是根在往下长。" },
  { text: "把钱和时间，花在会留下来的东西上。" },
  { text: "复利最需要的不是聪明，是不要中断。" },
  { text: "今天不必完成什么，只要留下痕迹。" },
  { text: "允许自己休息，也是一种自律。" },
  { text: "你的时间投向哪里，人生就长成什么样子。" },
  { text: "不必向任何人解释你为什么慢。" },
  { text: "认真生活的人，账本上都好看。" },
  { text: "先有底气，才谈长期。" },
  { text: "做那件三年后还愿意继续做的事。" },
  { text: "一次专注，胜过十次焦虑。" },
  { text: "情绪会过去，记录会留下。" },
  { text: "你今天写下的这一笔，是给三年后自己的信。" },
  { text: "进步常常安静得像什么都没发生。" },
  { text: "不着急这件事本身，就是一种底气。" },
  { text: "休息不是停下来，是把力气存起来。" },
  { text: "人生不是短跑，也不是马拉松，是无数个「今天」。" },
  { text: "你不必赢过谁，只要还在自己的路上。" },
  { text: "值得的事，都慢。" },
  { text: "把力气留给值得的人和值得的事。" },
  { text: "会记录的人，不太容易被时间偷走。" },
  { text: "你今天做的那一点点，是未来的底子。" },
  { text: "不慌，你只是走得比较远。" },
  { text: "笃定，是最好的运气。" },
  { text: "所谓长期主义：把想做的事，做成习惯。" },
  { text: "给自己留一点白，日子才不会溢出来。" },
  { text: "你不是没有进步，你只是没回头看过。" },
  { text: "少一点比较，多一点记录。" },
  { text: "生活要留一点给「不为什么」。" },
  { text: "愿你既有向前的力气，也有停下的从容。" },
  { text: "把手头这件事做完，就是今天最大的胜利。" },
  { text: "复利来自重复，重复来自喜欢。" },
  { text: "存下的不只是钱，是选择权。" },
  { text: "存款是底气，记录是证据。" },
  { text: "今天也谢谢你，没有放弃自己。" },
  { text: "人生的账本里，收入栏最多的应该是「我愿意」。" },
  { text: "走在自己的时区里，就不算迟到。" },
  { text: "慢慢来，但不要停。" },
  { text: "你所有的坚持，时间都记着。" },
  { text: "能长期做下去的事，一定要让人愉快。" },
  { text: "你不需要向谁证明，你只需要对自己诚实。" },
];

const MS_PER_DAY = 86_400_000;

/**
 * 本地日历天的序号。
 * 按年月日算而不是按时刻算 —— 否则当天几点几分会影响取到哪一句。
 */
export function dayNumber(date: Date = new Date()): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * 步长必须和句库总量互质，才能保证「一轮走完全部、期间不重复」。
 * 以后往句库里加句子也不用改这里。
 */
export const QUOTE_STEP = (() => {
  let step = 7;
  while (gcd(step, QUOTES.length) !== 1) step += 1;
  return step;
})();

export function quoteIndexForDay(day: number, total: number = QUOTES.length): number {
  const index = (day * QUOTE_STEP) % total;
  return index < 0 ? index + total : index;
}

export function quoteOfDay(date?: Date): Quote {
  return QUOTES[quoteIndexForDay(dayNumber(date))] ?? QUOTES[0];
}

/** 手动「换一句」时往下走一句。 */
export function afterIndex(index: number, forward = 1, total: number = QUOTES.length): number {
  return (((index + forward) % total) + total) % total;
}
