import { describe, expect, it } from 'vitest';
import { findOrderCode, newOrderCode } from '../orders/order-code';
import { buildVietQrUrl } from './vietqr';

describe('buildVietQrUrl', () => {
  it('builds the compact2 image URL with amount, order code as addInfo and the account name', () => {
    expect(
      buildVietQrUrl({
        bankBin: '970422',
        accountNo: '0123456789',
        accountName: 'PC BUILDER STORE',
        amount: 25_490_000,
        addInfo: 'PCBABCDEFGH',
      }),
    ).toBe(
      'https://img.vietqr.io/image/970422-0123456789-compact2.png?amount=25490000&addInfo=PCBABCDEFGH&accountName=PC%20BUILDER%20STORE',
    );
  });

  it('URL-encodes a Vietnamese account name', () => {
    const url = new URL(
      buildVietQrUrl({
        bankBin: '970436',
        accountNo: '1010101010',
        accountName: 'Nguyễn Văn Bình & Cộng sự',
        amount: 1_000_000,
        addInfo: 'PCB23456789',
      }),
    );
    expect(url.search).toContain(`accountName=${encodeURIComponent('Nguyễn Văn Bình & Cộng sự')}`);
    expect(url.searchParams.get('accountName')).toBe('Nguyễn Văn Bình & Cộng sự');
    expect(url.searchParams.get('amount')).toBe('1000000');
    expect(url.searchParams.get('addInfo')).toBe('PCB23456789');
    expect(url.pathname).toBe('/image/970436-1010101010-compact2.png');
  });

  it('rejects non-integer or negative amounts', () => {
    const base = { bankBin: '970422', accountNo: '1', accountName: 'A', addInfo: 'PCBAAAAAAAA' };
    expect(() => buildVietQrUrl({ ...base, amount: 10.5 })).toThrow();
    expect(() => buildVietQrUrl({ ...base, amount: -1 })).toThrow();
  });
});

describe('order codes in transfer content', () => {
  it('generates PCB + 8 uppercase base32 characters', () => {
    for (let i = 0; i < 50; i++) expect(newOrderCode()).toMatch(/^PCB[A-Z2-7]{8}$/);
  });

  it('finds the code wherever the bank put it, case-insensitively', () => {
    expect(findOrderCode('MBVCB.3278907687.PCBK7Q2ZX4M.CT tu 0123 toi')).toBe('PCBK7Q2ZX4M');
    expect(findOrderCode('thanh toan pcbk7q2zx4m')).toBe('PCBK7Q2ZX4M');
    expect(findOrderCode('chuyen tien mua iphone')).toBeNull();
    expect(findOrderCode('PCB1234')).toBeNull();
  });
});
