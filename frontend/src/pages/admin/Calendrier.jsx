import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';

const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function Calendrier() {
  const [reservations, setReservations] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => { fetchReservations(); }, []);

  const fetchReservations = async () => {
    try {
      const { data } = await api.get('/reservations-admin');
      setReservations(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getReservationsForDay = (day) => {
    return reservations.filter(r => {
      const start = new Date(r.date_debut);
      const end = new Date(r.date_fin);
      const d = new Date(year, month, day);
      return d >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
             d <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
    });
  };

  const statutColor = {
    confirmee: 'bg-blue-500',
    en_cours: 'bg-yellow-500',
    terminee: 'bg-green-500',
    annulee: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
          <Calendar size={20} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Calendrier</h1>
          <p className="text-neutral-500 text-sm">Planning des réservations</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-white font-semibold">{MOIS_FR[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {JOURS.map(j => (
            <div key={j} className="text-center text-neutral-500 text-xs font-medium py-2">{j}</div>
          ))}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayReservations = getReservationsForDay(day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            return (
              <div
                key={day}
                className={`min-h-[72px] p-1.5 rounded-xl border transition ${
                  isToday ? 'border-red-600/50 bg-red-600/5' : 'border-neutral-800/50 hover:bg-neutral-800/30'
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-red-400' : 'text-neutral-400'}`}>{day}</span>
                <div className="mt-1 space-y-0.5">
                  {dayReservations.slice(0, 2).map((r, idx) => (
                    <div key={idx} className={`h-1.5 ${statutColor[r.statut] || 'bg-neutral-600'} rounded-full`} title={`${r.client?.nom_complet} - ${r.vehicule?.marque} ${r.vehicule?.modele}`} />
                  ))}
                  {dayReservations.length > 2 && (
                    <span className="text-[10px] text-neutral-500">+{dayReservations.length - 2}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-800">
          <span className="text-neutral-500 text-xs">Légende :</span>
          {[
            { label: 'Confirmée', color: 'bg-blue-500' },
            { label: 'En cours', color: 'bg-yellow-500' },
            { label: 'Terminée', color: 'bg-green-500' },
            { label: 'Annulée', color: 'bg-red-500' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${l.color}`} />
              <span className="text-neutral-400 text-xs">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
