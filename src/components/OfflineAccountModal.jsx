import React, { useState } from 'react'
import { X, User, Check, Plus, Trash2, ShieldAlert } from 'lucide-react'
import { useProfileStore } from '../store/profileStore'

export default function OfflineAccountModal({ isOpen, onClose }) {
  const {
    offlineUsername,
    setOfflineUsername,
    savedOfflineAccounts,
    addOfflineAccount,
    removeOfflineAccount,
  } = useProfileStore()

  const [inputName, setInputName] = useState(offlineUsername)
  const [newAccountName, setNewAccountName] = useState('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [imgError, setImgError] = useState(false)

  if (!isOpen) return null

  const handleSaveCurrent = (e) => {
    e.preventDefault()
    const clean = inputName.trim()
    if (!clean) return
    setOfflineUsername(clean)
    setImgError(false)
    onClose()
  }

  const handleAddNewAccount = (e) => {
    e.preventDefault()
    const clean = newAccountName.trim()
    if (!clean) return
    addOfflineAccount(clean)
    setOfflineUsername(clean)
    setInputName(clean)
    setNewAccountName('')
    setIsAddingNew(false)
    setImgError(false)
  }

  const avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(inputName.trim() || 'Steve')}/80`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Offline Accounts Manager"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#14161b] border border-white/15 shadow-2xl p-6 flex flex-col gap-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Offline Account Manager</h3>
              <p className="text-[11px] text-slate-400">Switch or rename your offline Minecraft profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Account Preview & Edit */}
        <form onSubmit={handleSaveCurrent} className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0c0d10] border border-white/10 flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/60 border border-white/15 flex-shrink-0 flex items-center justify-center">
              {!imgError ? (
                <img
                  src={avatarUrl}
                  alt={inputName}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain filter drop-shadow"
                />
              ) : (
                <div className="w-full h-full bg-emerald-600 flex items-center justify-center font-black text-white text-xl">
                  {inputName ? inputName.slice(0, 2).toUpperCase() : 'MC'}
                </div>
              )}
              <div
                className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black"
                title="Offline Mode Active"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Player Username
              </label>
              <input
                type="text"
                value={inputName}
                maxLength={24}
                onChange={(e) => {
                  setInputName(e.target.value)
                  setImgError(false)
                }}
                placeholder="Enter username..."
                className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Offline UUID derived via RFC 4122 v3</span>
            <span className="font-mono text-emerald-400">OfflinePlayer:{inputName.trim() || 'Player'}</span>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Apply & Save Username</span>
          </button>
        </form>

        {/* Saved Accounts Quick Switcher (TLauncher style) */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Saved Accounts ({savedOfflineAccounts.length})
            </span>
            {!isAddingNew && (
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Account</span>
              </button>
            )}
          </div>

          {/* Add New Account Form */}
          {isAddingNew && (
            <form onSubmit={handleAddNewAccount} className="flex gap-2">
              <input
                type="text"
                value={newAccountName}
                maxLength={24}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="New username..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#0c0d10] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs transition-all"
              >
                Cancel
              </button>
            </form>
          )}

          {/* List of Accounts */}
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {savedOfflineAccounts.map((account) => {
              const isActive = account === offlineUsername
              return (
                <div
                  key={account}
                  onClick={() => {
                    setOfflineUsername(account)
                    setInputName(account)
                    setImgError(false)
                  }}
                  className={`px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer border transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-[#0c0d10] border-white/5 hover:border-white/15 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={`https://mc-heads.net/avatar/${encodeURIComponent(account)}/24`}
                      alt={account}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                      className="w-5 h-5 rounded-md object-contain bg-black/40"
                    />
                    <span className="font-mono text-xs font-bold truncate">{account}</span>
                    {isActive && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                        Active
                      </span>
                    )}
                  </div>

                  {savedOfflineAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeOfflineAccount(account)
                      }}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove from saved accounts"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200/80">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Offline mode allows launching Minecraft without Mojang/Microsoft login. Skins are resolved automatically via player heads.
          </span>
        </div>
      </div>
    </div>
  )
}
