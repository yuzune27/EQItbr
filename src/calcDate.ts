export type DiffDT = {
    years : number,
    months : number,
    days : number,
    hours :number,
    minutes : number
}

export function dateDiff(from: Date, to: Date) {
    let start = new Date(from);
    let end = new Date(to);
    if (start > end) [start, end] = [end, start];

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    let hours = end.getHours() - start.getHours();
    let minutes = end.getMinutes() - start.getMinutes();

    if (minutes < 0) {
        hours--;
        minutes += 60;
    }

    if (hours < 0) {
        days--;
        hours += 24;
    }

    if (days < 0) {
        months--;
        // 前の月の日数を取得
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
        days += prevMonth.getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    return { years, months, days, hours, minutes } as DiffDT;
}

export function parseOt(otStr : string) : Date {
    const match = otStr.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d)$/);
    if (!match) throw new Error("Invalid date format");

    const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr, msStr] = match;

    const year : number = Number(yearStr);
    const month : number = Number(monthStr) - 1; // 月は0始まり
    const day : number = Number(dayStr);
    const hour : number = Number(hourStr);
    const minute : number = Number(minuteStr);
    const second : number = Number(secondStr);
    const ms : number = Number(msStr.padEnd(3, '0'));

    return new Date(year, month, day, hour, minute, second, ms);
}

export function diffDateText (diff : DiffDT) : string {
    if (diff.years > 0) {
        return `${diff.years}年${diff.months}ヶ月${diff.days}日ぶり`;
    } else if (diff.months > 0) {
        return `${diff.months}ヶ月${diff.days}日ぶり`;
    } else if (diff.days > 0) {
        return `${diff.days}日ぶり`;
    } else {
        return `${diff.hours}時間${diff.minutes}分ぶり`;
    }
}

export function getExp (diff : DiffDT) : string | undefined {
    let exp : string | undefined;
    if (diff.years >= 10) {
        exp = "非常に珍しい"
    } else if (diff.years >= 5) {
        exp = "珍しい"
    } else if (diff.years >= 2) {
        exp = "やや珍しい"
    }

    return exp;
}