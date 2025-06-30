import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext.js'
import { playerService } from '../services/playerService.js'
import { Player } from '../config/supabase.js'
import BottomTabBar from '../components/BottomTabBar.js'
import { useNavigate } from 'react-router-dom'

const PlayersPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    age: '',
    height: '',
    weight: '',
    team: '',
    jersey_number: ''
  })

  useEffect(() => {
    if (user) {
      loadPlayers()
    }
  }, [user])

  const loadPlayers = async () => {
    try {
      setLoading(true)
      const data = await playerService.getPlayers(user!.id)
      setPlayers(data)
    } catch (error) {
      console.error('選手データの読み込みに失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const playerData = {
        ...formData,
        age: parseInt(formData.age),
        height: parseInt(formData.height),
        weight: parseInt(formData.weight),
        jersey_number: parseInt(formData.jersey_number),
        user_id: user.id
      }

      if (editingPlayer) {
        await playerService.updatePlayer(editingPlayer.id!, playerData)
      } else {
        await playerService.addPlayer(playerData)
      }

      setShowForm(false)
      setEditingPlayer(null)
      resetForm()
      loadPlayers()
    } catch (error) {
      console.error('選手データの保存に失敗:', error)
    }
  }

  const handleEdit = (player: Player) => {
    setEditingPlayer(player)
    setFormData({
      name: player.name,
      position: player.position,
      age: player.age.toString(),
      height: player.height.toString(),
      weight: player.weight.toString(),
      team: player.team,
      jersey_number: player.jersey_number.toString()
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('この選手を削除しますか？')) {
      try {
        await playerService.deletePlayer(id)
        loadPlayers()
      } catch (error) {
        console.error('選手の削除に失敗:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      age: '',
      height: '',
      weight: '',
      team: '',
      jersey_number: ''
    })
  }

  const positions = ['FW', 'MF', 'DF', 'GK']

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">選手管理</h1>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingPlayer(null)
            resetForm()
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          選手を追加
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingPlayer ? '選手を編集' : '選手を追加'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ポジション</label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年齢</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">身長 (cm)</label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                required
                min="100"
                max="250"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">体重 (kg)</label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                required
                min="0"
                max="150"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">チーム</label>
              <input
                type="text"
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">背番号</label>
              <input
                type="number"
                value={formData.jersey_number}
                onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                required
                min="1"
                max="99"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingPlayer ? '更新' : '追加'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingPlayer(null)
                  resetForm()
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">選手が登録されていません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((player) => (
            <div key={player.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{player.name}</h3>
                  <p className="text-gray-600">{player.team}</p>
                </div>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                  {player.jersey_number}番
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>ポジション: {player.position}</p>
                <p>年齢: {player.age}歳</p>
                <p>身長: {player.height}cm</p>
                <p>体重: {player.weight}kg</p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(player)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 transition-colors text-sm"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(player.id!)}
                  className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors text-sm"
                >
                  削除
                </button>
                <button
                  onClick={() => navigate(`/players/${player.id}`)}
                  className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  詳細
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <BottomTabBar />
    </div>
  )
}

export default PlayersPage 