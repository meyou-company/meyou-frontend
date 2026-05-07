import { useGlobalLoader } from "../../context/GlobalLoaderContext";
import "./GlobalLoader.scss";

export default function GlobalLoader() {
    const { isLoading } = useGlobalLoader();

     if (!isLoading) return null;

    return ( 
  <div className="global-loader">
    <div className="orbit">

    <img
      src="/earth.png"
      alt="earth"
      className="earth"
    />

    <div className="cometOrbit">
      <img
        src="/comet.png"
        alt="comet"
        className="comet"
      />
    </div>

  </div>
</div>
    );
}