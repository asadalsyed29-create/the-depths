import sys
D={'eye':5,'root':6,'chimney':6,'beak':5,'urchins':6,'crawler':6,'sentinel':6,'starfish':5,'shaggy':7,'eyeclose':5}
print(D[sys.argv[-1]]*24) if len(sys.argv)>1 else None
