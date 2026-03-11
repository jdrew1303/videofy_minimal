/** @jsxImportSource @revideo/2d/lib */
import { Img } from "@revideo/2d";

interface Props {
  logo: string;
  logoStyle: string;
}

export const Logo = ({ logo }: Props) => {
  return <Img src={logo} width={96} position={[400, -800]} />; // rough positioning
};
