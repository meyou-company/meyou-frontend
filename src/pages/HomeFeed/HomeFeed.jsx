import { useNavigate } from "react-router-dom";
import { FaMoneyBillWave, FaComments, FaShieldAlt } from "react-icons/fa";

export default function HomeFeed() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-meyou-bg text-white flex flex-col items-center px-4 py-10">
      
      {/* Верхні банери */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center gap-3">
        <div className="w-full rounded-full bg-meyou-gradient px-6 py-3 text-sm font-medium shadow-lg">
          Добро пожаловать в ME YOU — где знакомство превращается в выгоду
        </div>

        <div className="w-full max-w-sm rounded-full bg-meyou-gradient px-6 py-2 text-xs shadow-lg">
          Новое поколение знакомств — с бонусами за активность
        </div>
      </div>

      {/* Три фічі */}
      <div className="flex justify-center gap-10 mt-10 text-xs">
        <Feature icon={<FaMoneyBillWave />} title="Бонусы за друзей" />
        <Feature icon={<FaComments />} title="Современный чат" />
        <Feature icon={<FaShieldAlt />} title="Полная безопасность" />
      </div>

      {/* Логотип */}
      <div className="mt-12 border border-white/10 rounded-2xl p-8 bg-white/5 backdrop-blur-sm">
        <img
          src="/Logo/photo.jpeg"
          alt="Me You logo"
          className="w-64 h-auto object-contain"
        />
      </div>

      {/* Кнопки */}
      <div className="w-full max-w-md flex flex-col gap-4 mt-14">
        <button
          onClick={() => navigate("/register")}
          className="w-full py-3 rounded-full bg-meyou-gradient text-base font-semibold shadow-lg hover:opacity-90 transition"
        >
          Создать аккаунт
        </button>

        <button
          onClick={() => navigate("/login")}
             className="w-full py-3 rounded-full bg-meyou-gradient text-base font-semibold shadow-lg hover:opacity-90 transition"
        >
          Войти
        </button>
      </div>
    </div>
  );
}

function Feature({ icon, title }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-meyou-pink text-lg shadow-md">
        {icon}
      </div>
      <span className="text-[12px] text-white/70">{title}</span>
    </div>
  );
}
