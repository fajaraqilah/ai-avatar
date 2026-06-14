import argparse,json,os,joblib,numpy as np

def main():
    p=argparse.ArgumentParser(); p.add_argument('--text',required=True); p.add_argument('--model',default='./model/gesture_text_classifier.pkl'); p.add_argument('--mapping',default='./model/gesture_animation_mapping.json'); a=p.parse_args()
    if not os.path.exists(a.model): raise FileNotFoundError('Model belum ada. Jalankan train_gesture_classifier.py terlebih dahulu.')
    model=joblib.load(a.model); probs=model.predict_proba([a.text])[0]; classes=list(model.classes_); idx=int(np.argmax(probs)); label=classes[idx]; conf=float(probs[idx])
    mapping=json.load(open(a.mapping,encoding='utf-8')); info=mapping.get(label,{})
    print(json.dumps({'input_text':a.text,'gesture_label':label,'confidence':conf,'animation_clip':info.get('animation_clip','Idle'),'gesture_function':info.get('gesture_function',''),'pedagogical_context':info.get('pedagogical_context','')},ensure_ascii=False))
if __name__=='__main__': main()
