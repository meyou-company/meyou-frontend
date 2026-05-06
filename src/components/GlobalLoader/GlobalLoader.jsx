import { useGlobalLoader } from "../../context/GlobalLoaderContext";
import "./GlobalLoader.scss";

// export default function GlobalLoader() {
//   const { loading } = useGlobalLoader();

//   if (!loading) return null;

//     return ( 
//     <div className="global-loader">
//       <div className="orbit">
//         <h1>HIIIIIIIIIIIIIIIIIIIIIIII</h1>
//         <img src="/earth.png" alt="earth" className="earth" />
//         <img src="/comet.png" alt="comet" className="comet" />   
//       </div>
//     </div> 
//     );
// }

export default function GlobalLoader() {
  const { isLoading } = useGlobalLoader();

  if (!isLoading) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "red",
      zIndex: 999999
    }}>
      LOADER
    </div>
  );
}