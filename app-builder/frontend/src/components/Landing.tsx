import Login from './Login'
import Signup from './Signup'

export default function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-md">AppBuilder</h1>
          <p className="mt-4 text-slate-200 max-w-xl">Design landing pages and prototypes instantly. Drag, edit and preview — then save and share.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <button className="btn btn-primary" onClick={onLogin}>Get started</button>
            <a className="btn bg-white/10 hover:bg-white/20 text-white" href="#features">Learn more</a>
          </div>
        </div>

        <div className="bg-white/5 p-4 rounded-xl shadow-lg">
          <div className="grid grid-cols-1 gap-4">
            <div className="card bg-transparent">
              <h3 className="text-lg font-semibold text-white">Sign in</h3>
              <Login onLogin={onLogin} />
            </div>
            <div className="card bg-transparent">
              <h3 className="text-lg font-semibold text-white">Sign up</h3>
              <Signup onSignup={onLogin} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
