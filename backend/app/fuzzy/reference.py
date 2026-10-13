CASES=[(0,0),(50,50),(90,90),(100,100),(0,90),(90,0),(25,25),(70,70),(40,60),(20,80)]
CONSEQUENTS=[["LOW","LOW","MEDIUM"],["LOW","MEDIUM","HIGH"],["MEDIUM","HIGH","HIGH"]]
PARAMETERS={"LOW":("TRAPEZOID",[0,0,20,40]),"MEDIUM":("TRIANGLE",[20,50,80,None]),"HIGH":("TRAPEZOID",[60,80,100,100])}

def exact_reference(academic,competency):
    # Independent analytic integration of a piecewise linear clipped envelope.
    def mu(x,code):
        if code=="LOW":
            return 1.0 if x<=20 else max(0.0,(40-x)/20)
        if code=="HIGH":
            return 1.0 if x>=80 else max(0.0,(x-60)/20)
        return max(0.0,1-abs(x-50)/30)
    labels=["LOW","MEDIUM","HIGH"]
    alphas={c:0.0 for c in labels}
    for i,a in enumerate(labels):
        for j,c in enumerate(labels):
            output=CONSEQUENTS[i][j]
            alphas[output]=max(alphas[output],min(mu(academic,a),mu(competency,c)))
    knots={0.0,20.0,40.0,50.0,60.0,80.0,100.0}
    for code,alpha in alphas.items():
        if code=="LOW":
            knots.add(40-20*alpha)
        elif code=="HIGH":
            knots.add(60+20*alpha)
        else:
            knots.update([20+30*alpha,80-30*alpha])
    def clipped(z,code):
        return min(alphas[code],mu(z,code))
    ordered=sorted(knots)
    for left,right in zip(ordered,ordered[1:]):
        for i,a in enumerate(labels):
            for b in labels[i+1:]:
                dl=clipped(left,a)-clipped(left,b)
                dr=clipped(right,a)-clipped(right,b)
                if dl*dr<0:
                    knots.add(left+(right-left)*dl/(dl-dr))
    area,moment=0.0,0.0
    points=sorted(knots)
    for left,right in zip(points,points[1:]):
        y0=max(clipped(left,c) for c in labels)
        y1=max(clipped(right,c) for c in labels)
        width=right-left
        segment=width*(y0+y1)/2
        area+=segment
        moment+=left*segment+width*width*(y0/2+(y1-y0)/3)
    if area<=0:
        raise ValueError("Empty reference output")
    return moment/area
