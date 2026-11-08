import { Plus, Trash2 } from 'lucide-react';
import { formatVnd } from '../../utils/format';
import { MAX_RULES, RULE_TYPE_LABEL, newRuleDraft, type RuleDraft, type RuleType } from './promotionRules';
import type { VariantOption } from './useStoreVariants';
import { ErrorAlert, LoadingText } from './SellerUi';

interface PromotionRulesEditorProps {
  idPrefix: string;
  rules: RuleDraft[];
  onChange: (rules: RuleDraft[]) => void;
  /** All variants of the promotion's store; undefined while loading. */
  variants: VariantOption[] | undefined;
  variantsError?: string;
  onRetryVariants: () => void;
}

const RULE_HELP: Record<RuleType, string> = {
  PERCENT_DISCOUNT: 'Không chọn biến thể = giảm cho mọi dòng hàng của gian hàng. Các mức % cộng dồn, tối đa 100% mỗi dòng.',
  FIXED_DISCOUNT: 'Không chọn biến thể = giảm trên tổng đơn của gian hàng (chia theo tỉ lệ giá trị các dòng). '
    + 'Có chọn biến thể = giảm một lần cho dòng hàng đó.',
  BUY_X_GET_Y: 'Khi khách mua đủ X sản phẩm của biến thể cần mua và có biến thể tặng trong giỏ, Y sản phẩm tặng được miễn phí.'
};

export default function PromotionRulesEditor({
  idPrefix, rules, onChange, variants, variantsError, onRetryVariants
}: PromotionRulesEditorProps) {
  const update = (key: string, patch: Partial<RuleDraft>) =>
    onChange(rules.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const activeCount = variants?.filter((v) => v.status === 'ACTIVE').length ?? 0;

  return (
    <div className="space-y-3">
      {variantsError && <ErrorAlert message={`Không tải được biến thể của gian hàng: ${variantsError}`} onRetry={onRetryVariants} />}
      {!variants && !variantsError && <LoadingText label="Đang tải biến thể sản phẩm của gian hàng…" />}
      {variants && activeCount === 0 && (
        <p className="mss-alert mss-alert--warning m-0">
          Gian hàng chưa có biến thể nào đang bán (ACTIVE). Bạn vẫn tạo được ưu đãi áp dụng cho toàn gian hàng;
          ưu đãi theo biến thể và “Mua X tặng Y” cần biến thể đang bán.
        </p>
      )}

      {rules.map((rule, index) => {
        const id = `${idPrefix}-${rule.key}`;
        return (
          <fieldset key={rule.key} className="border border-gray-200 rounded-xl p-4 space-y-3 min-w-0">
            <legend className="px-1 text-sm font-semibold text-gray-800">Điều kiện {index + 1}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="mss-field">
                <span className="mss-label">Loại ưu đãi</span>
                <select className="mss-select" value={rule.ruleType}
                  onChange={(e) => update(rule.key, { ruleType: e.target.value as RuleType })}>
                  {(Object.keys(RULE_TYPE_LABEL) as RuleType[]).map((type) => (
                    <option key={type} value={type}>{RULE_TYPE_LABEL[type]}</option>
                  ))}
                </select>
              </label>

              {rule.ruleType === 'PERCENT_DISCOUNT' && (
                <label className="mss-field">
                  <span className="mss-label">Phần trăm giảm (%) *</span>
                  <input className="mss-input" type="number" min={0.01} max={100} step={0.01} inputMode="decimal"
                    value={rule.discountPercent} onChange={(e) => update(rule.key, { discountPercent: e.target.value })} />
                </label>
              )}
              {rule.ruleType === 'FIXED_DISCOUNT' && (
                <label className="mss-field">
                  <span className="mss-label">Số tiền giảm (VND) *</span>
                  <input className="mss-input" type="number" min={1} step={1} inputMode="numeric"
                    value={rule.discountAmount} onChange={(e) => update(rule.key, { discountAmount: e.target.value })} />
                </label>
              )}

              <div className="mss-field">
                <label className="mss-label" htmlFor={`${id}-target`}>
                  {rule.ruleType === 'BUY_X_GET_Y' ? 'Biến thể cần mua *' : 'Áp dụng cho biến thể'}
                </label>
                <VariantSelect
                  id={`${id}-target`}
                  value={rule.targetVariantId}
                  onChange={(value) => update(rule.key, { targetVariantId: value })}
                  variants={variants}
                  emptyLabel={rule.ruleType === 'BUY_X_GET_Y' ? '— Chọn biến thể —' : 'Toàn bộ gian hàng'}
                />
              </div>
              <label className="mss-field">
                <span className="mss-label">
                  {rule.ruleType === 'BUY_X_GET_Y' ? 'Số lượng mua (X) *' : 'Số lượng tối thiểu (tùy chọn)'}
                </span>
                <input className="mss-input" type="number" min={1} step={1} inputMode="numeric"
                  value={rule.minQuantity} onChange={(e) => update(rule.key, { minQuantity: e.target.value })} />
              </label>

              {rule.ruleType === 'BUY_X_GET_Y' && (
                <>
                  <div className="mss-field">
                    <label className="mss-label" htmlFor={`${id}-reward`}>Biến thể được tặng *</label>
                    <VariantSelect
                      id={`${id}-reward`}
                      value={rule.rewardVariantId}
                      onChange={(value) => update(rule.key, { rewardVariantId: value })}
                      variants={variants}
                      emptyLabel="— Chọn biến thể —"
                    />
                  </div>
                  <label className="mss-field">
                    <span className="mss-label">Số lượng tặng (Y) *</span>
                    <input className="mss-input" type="number" min={1} step={1} inputMode="numeric"
                      value={rule.rewardQuantity} onChange={(e) => update(rule.key, { rewardQuantity: e.target.value })} />
                  </label>
                </>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <p className="text-xs text-gray-500 m-0">{RULE_HELP[rule.ruleType]}</p>
              <button type="button" className="mss-button mss-button--danger mss-button--sm shrink-0"
                disabled={rules.length <= 1} onClick={() => onChange(rules.filter((r) => r.key !== rule.key))}>
                <Trash2 className="w-4 h-4" aria-hidden />
                Bỏ điều kiện
              </button>
            </div>
          </fieldset>
        );
      })}

      <button type="button" className="mss-button mss-button--secondary mss-button--sm"
        disabled={rules.length >= MAX_RULES} onClick={() => onChange([...rules, newRuleDraft()])}>
        <Plus className="w-4 h-4" aria-hidden />
        Thêm điều kiện ({rules.length}/{MAX_RULES})
      </button>
    </div>
  );
}

interface VariantSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  variants: VariantOption[] | undefined;
  emptyLabel: string;
}

/** ACTIVE variants grouped by product; a selected variant that is no longer ACTIVE stays visible so it is not lost. */
function VariantSelect({ id, value, onChange, variants, emptyLabel }: VariantSelectProps) {
  const active = (variants ?? []).filter((v) => v.status === 'ACTIVE');
  const groups = new Map<string, VariantOption[]>();
  for (const v of active) groups.set(`${v.productId}`, [...(groups.get(`${v.productId}`) ?? []), v]);
  const selectedInactive = value && !active.some((v) => String(v.variantId) === value)
    ? variants?.find((v) => String(v.variantId) === value)
    : undefined;

  return (
    <select id={id} className="mss-select" value={value} disabled={!variants} onChange={(e) => onChange(e.target.value)}>
      <option value="">{variants ? emptyLabel : 'Đang tải biến thể…'}</option>
      {value && !active.some((v) => String(v.variantId) === value) && (
        <option value={value}>
          {selectedInactive
            ? `${selectedInactive.productName} — ${selectedInactive.variantName} (không còn đang bán)`
            : `Biến thể #${value}`}
        </option>
      )}
      {[...groups.values()].map((list) => (
        <optgroup key={list[0].productId} label={list[0].productName}>
          {list.map((v) => (
            <option key={v.variantId} value={String(v.variantId)}>
              {v.variantName} · {v.sku} · {formatVnd(v.basePrice)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
