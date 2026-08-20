import * as React from "react";
import { Button } from "react-native-paper";

const CustomButton = ({
  onPress,
  title,
  mode = "contained",
  style,
  ...props
}) => {
  return (
    <Button mode={mode} onPress={onPress} style={style} {...props}>
      {title}
    </Button>
  );
};

export default CustomButton;