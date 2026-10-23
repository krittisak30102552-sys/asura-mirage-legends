/**
 * Stage Shop Modal:
 * Displays 3 items per stage
 * Reroll base cost: 20 coins, increases by +10 each reroll (20, 30, 40...)
 */

import React from 'react';
import { X, RefreshCw, Sparkles } from 'lucide-react';
import { ShopOfferItem } from '../game/levelSystem';
import { formatEquipmentStatSummary } from '../game/equipmentStats';
import { ItemIcon } from './ItemIcon';

const rarityStyle = {
  common: { label: 'ทั่วไป', text: 'text-zinc-300', border: 'border-zinc-500/50' },
  rare: { label: 'หายาก', text: 'text-sky-300', border: 'border-sky-500/60' },
  epic: { label: 'มหากาพย์', text: 'text-purple-300', border: 'border-purple-500/60' },
  legendary: { label: 'ตำนาน', text: 'text-amber-300', border: 'border-amber-400/70' },
} as const;

interface StageShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerGold: number;
  offers: ShopOfferItem[];
  rerollCost: number;
  rerollCount: number;
  onBuyItem: (offer: ShopOfferItem) => void;
  onReroll: () => void;
}

export const StageShopModal: React.FC<StageShopModalProps> = ({
  isOpen,
  onClose,
  playerGold,
  offers,
  rerollCost,
  rerollCount,
  onBuyItem,
  onReroll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 select-none animate-fade-in backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-amber-500/90 rounded-2xl p-5 sm:p-6 shadow-2xl text-zinc-200 flex flex-col justify-between overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-950/60 border border-amber-500 rounded-lg flex items-center justify-center text-2xl shrink-0">
              🛒
            </div>
            <div>
              <h3 className="font-pixel text-amber-400 text-sm">
                ร้านค้าประจำฉาก (STAGE SHOP)
              </h3>
              <p className="text-xs font-rajdhani text-zinc-400">
                อุปกรณ์เพิ่มค่าสถานะสุ่ม 3 ชิ้น
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-500/60 px-3 py-1.5 rounded-lg mr-8">
            <span className="text-amber-400 text-sm font-pixel">💰</span>
            <span className="text-amber-300 font-pixel text-sm">{playerGold}</span>
            <span className="text-[10px] text-zinc-400 font-rajdhani">เหรียญ</span>
          </div>
        </div>

        {/* 3 Shop Items */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {offers.map((offer) => {
            const canAfford = playerGold >= offer.cost && !offer.purchased;
            return (
              <div
                key={offer.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  offer.purchased
                    ? 'bg-zinc-900/40 border-zinc-800 opacity-60'
                    : `bg-zinc-900/90 ${rarityStyle[offer.itemData.rarity].border} hover:border-amber-400 shadow-md`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                      <ItemIcon itemId={offer.itemData.id} rarity={offer.itemData.rarity} size={34} />
                    </span>
                    <span className={`text-[9px] font-pixel px-1.5 py-0.5 rounded font-bold bg-zinc-950 ${rarityStyle[offer.itemData.rarity].text}`}>
                      {rarityStyle[offer.itemData.rarity].label}
                    </span>
                  </div>

                  <h4 className="font-rajdhani font-bold text-sm text-zinc-100 mb-1 leading-snug line-clamp-1">
                    {offer.nameTh}
                  </h4>
                  <p className="text-[11px] font-rajdhani text-emerald-200 leading-tight mb-1.5 line-clamp-2">
                    {formatEquipmentStatSummary(offer.itemData)}
                  </p>
                  <p className="text-[10px] font-rajdhani text-zinc-500 leading-tight mb-3 line-clamp-2">
                    {offer.descTh}
                  </p>
                </div>

                <button
                  disabled={!canAfford || offer.purchased}
                  onClick={() => onBuyItem(offer)}
                  className={`w-full py-2 px-3 rounded-lg font-pixel text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                    offer.purchased
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : canAfford
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-zinc-950 shadow-md cursor-pointer active:scale-95'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                  }`}
                >
                  {offer.purchased ? (
                    <span>ซื้อแล้ว (SOLD)</span>
                  ) : (
                    <>
                      <span>ซื้อ {offer.cost}</span>
                      <span className="text-xs">💰</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer with Reroll Button (starts at 20, +10 each reroll) */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
          <div className="text-xs font-rajdhani text-zinc-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" />
            <span>รีโรลสินค้าใหม่ (ครั้งแรก 20 เหรียญ แล้วเพิ่มทีละ 10)</span>
            {rerollCount > 0 && (
              <span className="text-[11px] font-pixel text-amber-400 ml-1">
                (รีโรลไปแล้ว {rerollCount} ครั้ง)
              </span>
            )}
          </div>

          <button
            disabled={playerGold < rerollCost}
            onClick={onReroll}
            className={`py-2 px-4 rounded-xl font-pixel text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              playerGold >= rerollCost
                ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/60 shadow-md active:scale-95'
                : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
            }`}
          >
            <RefreshCw size={13} className={playerGold >= rerollCost ? 'text-amber-400' : 'text-zinc-600'} />
            <span>REROLL ({rerollCost} 💰)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
