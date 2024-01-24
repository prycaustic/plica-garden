export type OcticonsId =
  | "close"
  | "edit"
  | "eye-closed"
  | "eye"
  | "gear"
  | "kebab-horizontal"
  | "three-bars"
  | "upload";

export type OcticonsKey =
  | "Close"
  | "Edit"
  | "EyeClosed"
  | "Eye"
  | "Gear"
  | "KebabHorizontal"
  | "ThreeBars"
  | "Upload";

export enum Octicons {
  Close = "close",
  Edit = "edit",
  EyeClosed = "eye-closed",
  Eye = "eye",
  Gear = "gear",
  KebabHorizontal = "kebab-horizontal",
  ThreeBars = "three-bars",
  Upload = "upload",
}

export const OCTICONS_CODEPOINTS: { [key in Octicons]: string } = {
  [Octicons.Close]: "61697",
  [Octicons.Edit]: "61698",
  [Octicons.EyeClosed]: "61699",
  [Octicons.Eye]: "61700",
  [Octicons.Gear]: "61701",
  [Octicons.KebabHorizontal]: "61702",
  [Octicons.ThreeBars]: "61703",
  [Octicons.Upload]: "61704",
};
