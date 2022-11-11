function testLocalStorage() {
  const st = window.localStorage;
  console.log("st.length", st.length);
  let pr = st.getItem("preitinger");
  console.log("pr", pr);
  let prn;
  console.log("getItem(kontrolle)", st.getItem("kontrolle"));

  if (!pr) {
    prn = 0;
  } else {
    prn = Number(pr);
  }

  console.log("prn", prn);

  if (isNaN(prn)) {
    console.log("prn was nan");
    prn = 0;
  } else {
    console.log("prn was not nan");
    ++prn;
  }

  st.setItem("preitinger", prn);
  st.setItem("kontrolle", "wert");

  return prn;
}

export default testLocalStorage;
