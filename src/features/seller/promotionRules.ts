/**
 * Promotion rule drafts (form state) and their conversion to the CatalogStoreService contract.
 * Per ruleType only the fields below may be sent; fields of other types make the backend answer 400:
 * - PERCENT_DISCOUNT: discountPercent in (0, 100], optional targetVariantId (none = every line), optional minQuantity
 * - FIXED_DISCOUNT:   discountAmount > 0, optional targetVariantId (none = whole store order), optional minQuantity
 * - BUY_X_GET_Y:      targetVariantId, minQuantity (X), rewardVariantId, rewardQuantity (Y)
 */
import type { PromotionRuleRequest, PromotionRuleResponse } from '../../services/api';
import { formatVnd } from '../../utils/format';
import { parseWholeNumber } from './sellerShared';

export type RuleType = PromotionRuleRequest['ruleType'];

/** Backend limit (PromotionServiceImpl.MAX_RULES). */
export const MAX_RULES = 20;

export const RULE_TYPE_LABEL: Record<RuleType, string> = {
  PERCENT_DISCOUNT: 'Giảm theo phần trăm',
  FIXED_DISCOUNT: 'Giảm số tiền cố định',
  BUY_X_GET_Y: 'Mua X tặng Y'
};

export interface RuleDraft {
  key: string;
  ruleType: RuleType;
  /** Variant ids as select values; '' = none. */
  targetVariantId: string;
  rewardVariantId: string;
  minQuantity: string;
  discountPercent: string;
  discountAmount: string;
  rewardQuantity: string;
}

let draftSeq = 0;
const nextKey = () => `rule-${++draftSeq}`;
const text = (value: number | null | undefined) => (value == null ? '' : String(value));

export function newRuleDraft(ruleType: RuleType = 'PERCENT_DISCOUNT'): RuleDraft {
  return {
    key: nextKey(), ruleType, targetVariantId: '', rewardVariantId: '', minQuantity: '',
    discountPercent: '', discountAmount: '', rewardQuantity: ''
  };
}

export function ruleToDraft(rule: PromotionRuleResponse): RuleDraft {
  return {
    key: nextKey(),
    ruleType: rule.ruleType,
    targetVariantId: text(rule.targetVariantId),
    rewardVariantId: text(rule.rewardVariantId),
    minQuantity: text(rule.minQuantity),
    discountPercent: text(rule.discountPercent),
    discountAmount: text(rule.discountAmount),
    rewardQuantity: text(rule.rewardQuantity)
  };
}

const positiveInt = (value: string) => {
  const n = parseWholeNumber(value);
  return n !== null && n >= 1 ? n : null;
};

/** Validates the drafts and builds the request body; returns an error message instead when invalid. */
export function toRuleRequests(drafts: RuleDraft[]): PromotionRuleRequest[] | string {
  if (drafts.length === 0) return 'Khuyến mãi cần ít nhất một điều kiện.';
  if (drafts.length > MAX_RULES) return `Tối đa ${MAX_RULES} điều kiện cho một khuyến mãi.`;
  const rules: PromotionRuleRequest[] = [];
  for (const [index, d] of drafts.entries()) {
    const at = `Điều kiện ${index + 1}: `;
    const target = d.targetVariantId ? Number(d.targetVariantId) : undefined;
    const minQuantity = d.minQuantity.trim() ? positiveInt(d.minQuantity) : undefined;
    if (minQuantity === null) return `${at}số lượng phải là số nguyên từ 1 trở lên.`;

    if (d.ruleType === 'PERCENT_DISCOUNT') {
      const raw = d.discountPercent.trim();
      const percent = Number(raw);
      if (!/^\d+(\.\d{1,2})?$/.test(raw) || !(percent > 0 && percent <= 100)) {
        return `${at}phần trăm giảm phải lớn hơn 0 và không quá 100 (tối đa 2 chữ số thập phân).`;
      }
      rules.push({ ruleType: d.ruleType, discountPercent: percent, targetVariantId: target, minQuantity });
    } else if (d.ruleType === 'FIXED_DISCOUNT') {
      const amount = parseWholeNumber(d.discountAmount);
      if (amount === null || amount <= 0) return `${at}số tiền giảm phải là số nguyên VND lớn hơn 0.`;
      rules.push({ ruleType: d.ruleType, discountAmount: amount, targetVariantId: target, minQuantity });
    } else {
      const reward = d.rewardVariantId ? Number(d.rewardVariantId) : undefined;
      const rewardQuantity = positiveInt(d.rewardQuantity);
      if (target === undefined || reward === undefined) return `${at}chọn biến thể cần mua và biến thể được tặng.`;
      if (minQuantity === undefined || rewardQuantity === null) {
        return `${at}nhập số lượng mua (X) và số lượng tặng (Y), là số nguyên từ 1 trở lên.`;
      }
      rules.push({ ruleType: d.ruleType, targetVariantId: target, minQuantity, rewardVariantId: reward, rewardQuantity });
    }
  }
  return rules;
}

/** Human-readable rule summary; `variantLabel` resolves a variant id to a name. */
export function describeRule(rule: PromotionRuleResponse, variantLabel: (variantId: number) => string): string {
  const min = rule.minQuantity ? `, khi mua từ ${rule.minQuantity} sản phẩm` : '';
  if (rule.ruleType === 'PERCENT_DISCOUNT') {
    const scope = rule.targetVariantId ? `cho ${variantLabel(rule.targetVariantId)}` : 'cho mọi sản phẩm của gian hàng';
    return `Giảm ${Number(rule.discountPercent).toLocaleString('vi-VN')}% ${scope}${min}`;
  }
  if (rule.ruleType === 'FIXED_DISCOUNT') {
    const scope = rule.targetVariantId ? `cho dòng hàng ${variantLabel(rule.targetVariantId)}` : 'trên tổng đơn của gian hàng';
    return `Giảm ${formatVnd(rule.discountAmount)} ${scope}${min}`;
  }
  const target = rule.targetVariantId ? variantLabel(rule.targetVariantId) : '—';
  const reward = rule.rewardVariantId ? variantLabel(rule.rewardVariantId) : '—';
  return `Mua ${rule.minQuantity} × ${target}, tặng ${rule.rewardQuantity} × ${reward}`;
}
